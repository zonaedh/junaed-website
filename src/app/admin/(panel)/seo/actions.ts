"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { requireRole } from "@/lib/rbac";
import { logActivity, ACTIONS } from "@/lib/audit";
import {
  clearNotFoundLog,
  createRedirect,
  deleteNotFound,
  deleteRedirect,
  updateRedirect,
} from "@/lib/seo/repository";
import { canonicalPath } from "@/lib/seo/core";

/**
 * SEO admin actions: redirects and the 404 log.
 *
 * Every action re-checks the role on the server. The UI hides what a role
 * cannot do, but hiding a button is not a permission check.
 *
 * Redirect writes invalidate the `redirects` tag, which is what makes a new
 * redirect take effect on the next request instead of after a cache expiry.
 */

export type SeoActionState = {
  status: "idle" | "success" | "error";
  message?: string;
};

// The UI offers permanent/temporary; the repository collapses these to 308/307.
const VALID_CODES = [301, 302, 307, 308];

function revalidateSeo() {
  revalidateTag("redirects", { expire: 0 });
  revalidatePath("/seo");
}

/** A destination must be a site-relative path or an absolute http(s) URL. */
function validateDestination(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "Enter where this should redirect to.";
  if (/^https?:\/\/\S+$/i.test(trimmed)) return null;
  if (trimmed.startsWith("/")) return null;
  return "Use a path starting with / or a full https:// URL.";
}

export async function addRedirect(
  _prev: SeoActionState,
  formData: FormData,
): Promise<SeoActionState> {
  const user = await requireRole("editor");

  const fromPath = String(formData.get("fromPath") ?? "").trim();
  const toPath = String(formData.get("toPath") ?? "").trim();
  const code = Number(formData.get("code") ?? 301);

  if (!fromPath) return { status: "error", message: "Enter the old path." };
  if (!VALID_CODES.includes(code)) {
    return { status: "error", message: "Use 301, 302, 307 or 308." };
  }

  const destinationError = validateDestination(toPath);
  if (destinationError) return { status: "error", message: destinationError };

  const normalisedFrom = canonicalPath(fromPath);
  if (normalisedFrom === canonicalPath(toPath)) {
    return { status: "error", message: "A path cannot redirect to itself." };
  }

  try {
    const row = await createRedirect({ fromPath: normalisedFrom, toPath, code });
    await logActivity({
      userId: user.id,
      action: ACTIONS.redirectCreated,
      entity: "redirect",
      entityId: row.id,
      meta: { fromPath: row.fromPath, toPath: row.toPath, code: row.code },
    });
    revalidateSeo();
    return { status: "success", message: `Redirect added: ${row.fromPath} → ${row.toPath}` };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown";
    // The unique index on from_path is the expected failure here.
    if (message.includes("redirects_from_unique") || message.includes("duplicate key")) {
      return {
        status: "error",
        message: "A redirect for that path already exists. Edit it instead.",
      };
    }
    console.error("[seo] addRedirect failed", message);
    return { status: "error", message: "Could not save the redirect." };
  }
}

export async function toggleRedirect(
  _prev: SeoActionState,
  formData: FormData,
): Promise<SeoActionState> {
  const user = await requireRole("editor");

  const id = Number(formData.get("id"));
  const isActive = String(formData.get("isActive") ?? "") === "true";
  if (!Number.isInteger(id) || id <= 0) {
    return { status: "error", message: "Invalid redirect." };
  }

  const row = await updateRedirect(id, { isActive });
  if (!row) return { status: "error", message: "Redirect not found." };

  await logActivity({
    userId: user.id,
    action: ACTIONS.redirectUpdated,
    entity: "redirect",
    entityId: id,
    meta: { isActive },
  });
  revalidateSeo();
  return { status: "success", message: isActive ? "Redirect enabled." : "Redirect disabled." };
}

export async function removeRedirect(
  _prev: SeoActionState,
  formData: FormData,
): Promise<SeoActionState> {
  const user = await requireRole("editor");

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) {
    return { status: "error", message: "Invalid redirect." };
  }

  const removed = await deleteRedirect(id);
  if (!removed) return { status: "error", message: "Redirect not found." };

  await logActivity({
    userId: user.id,
    action: ACTIONS.redirectDeleted,
    entity: "redirect",
    entityId: id,
  });
  revalidateSeo();
  return { status: "success", message: "Redirect deleted." };
}

export async function dismissNotFound(
  _prev: SeoActionState,
  formData: FormData,
): Promise<SeoActionState> {
  await requireRole("editor");

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) {
    return { status: "error", message: "Invalid entry." };
  }

  const removed = await deleteNotFound(id);
  if (!removed) return { status: "error", message: "Entry not found." };

  revalidatePath("/seo");
  return { status: "success", message: "Removed from the log." };
}

export async function clearNotFound(
  _prev: SeoActionState,
): Promise<SeoActionState> {
  // `_prev` is required by useActionState's signature; the value is unused.
  void _prev;
  const user = await requireRole("admin");

  const removed = await clearNotFoundLog();
  await logActivity({
    userId: user.id,
    action: ACTIONS.notFoundCleared,
    entity: "not_found_log",
    meta: { removed },
  });
  revalidatePath("/seo");
  return { status: "success", message: `Cleared ${removed} entries.` };
}
