"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { requireRole } from "@/lib/rbac";
import { logActivity, ACTIONS } from "@/lib/audit";
import {
  createScript,
  deleteScript,
  rollbackScript,
  updateScript,
  type ScriptLocation,
} from "@/lib/analytics/scripts";

/**
 * Custom script actions (MVP.md §7.2).
 *
 * Owner and admin only. A script runs on every public page, so this is the
 * highest-privilege write in the panel after staff management — `editor` is
 * deliberately not enough.
 */

export type ScriptActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  warnings?: string[];
};

const VALID_LOCATIONS: readonly ScriptLocation[] = ["head", "body_start", "body_end"];

function revalidateScripts() {
  revalidateTag("scripts", { expire: 0 });
  revalidatePath("/scripts");
}

/** Parse a newline-separated scope list into an array, or null for "all pages". */
function parseScope(value: string): string[] | null {
  const lines = value
    .split(/[\n,]/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) return null;

  // A scope must look like a path; anything else would silently never match.
  return lines
    .filter((line) => line.startsWith("/"))
    .map((line) => line.slice(0, 200));
}

export async function addScript(
  _prev: ScriptActionState,
  formData: FormData,
): Promise<ScriptActionState> {
  const user = await requireRole("admin");

  const name = String(formData.get("name") ?? "").trim();
  const location = String(formData.get("location") ?? "head") as ScriptLocation;
  const code = String(formData.get("code") ?? "").trim();
  const scope = parseScope(String(formData.get("pageScope") ?? ""));
  const isActive = formData.get("isActive") === "on";

  if (!name) return { status: "error", message: "Give the script a name." };
  if (!VALID_LOCATIONS.includes(location)) {
    return { status: "error", message: "Invalid location." };
  }
  if (!code) return { status: "error", message: "Paste the snippet." };

  const row = await createScript({
    name: name.slice(0, 120),
    location,
    code,
    pageScope: scope,
    isActive,
    createdBy: user.id,
  });

  await logActivity({
    userId: user.id,
    action: ACTIONS.scriptCreated,
    entity: "script",
    entityId: row.id,
    meta: { name: row.name, location: row.location, isActive: row.isActive },
  });

  revalidateScripts();
  return {
    status: "success",
    message: `Added "${row.name}".${isActive ? "" : " It is inactive, so it is not loading yet."}`,
  };
}

export async function saveScript(
  _prev: ScriptActionState,
  formData: FormData,
): Promise<ScriptActionState> {
  const user = await requireRole("admin");

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) {
    return { status: "error", message: "Invalid script." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const location = String(formData.get("location") ?? "head") as ScriptLocation;
  const code = String(formData.get("code") ?? "").trim();
  const scope = parseScope(String(formData.get("pageScope") ?? ""));
  const isActive = formData.get("isActive") === "on";

  if (!name) return { status: "error", message: "Give the script a name." };
  if (!VALID_LOCATIONS.includes(location)) {
    return { status: "error", message: "Invalid location." };
  }
  if (!code) return { status: "error", message: "The snippet cannot be empty." };

  const row = await updateScript(id, {
    name: name.slice(0, 120),
    location,
    code,
    pageScope: scope,
    isActive,
  });
  if (!row) return { status: "error", message: "Script not found." };

  await logActivity({
    userId: user.id,
    action: ACTIONS.scriptUpdated,
    entity: "script",
    entityId: id,
    meta: { name: row.name, location: row.location, isActive: row.isActive },
  });

  revalidateScripts();
  return { status: "success", message: "Saved. The previous version is kept for rollback." };
}

export async function toggleScript(
  _prev: ScriptActionState,
  formData: FormData,
): Promise<ScriptActionState> {
  const user = await requireRole("admin");

  const id = Number(formData.get("id"));
  const isActive = String(formData.get("isActive") ?? "") === "true";
  if (!Number.isInteger(id) || id <= 0) {
    return { status: "error", message: "Invalid script." };
  }

  const row = await updateScript(id, { isActive });
  if (!row) return { status: "error", message: "Script not found." };

  await logActivity({
    userId: user.id,
    action: ACTIONS.scriptUpdated,
    entity: "script",
    entityId: id,
    meta: { isActive },
  });

  revalidateScripts();
  return { status: "success", message: isActive ? "Script enabled." : "Script disabled." };
}

export async function revertScript(
  _prev: ScriptActionState,
  formData: FormData,
): Promise<ScriptActionState> {
  const user = await requireRole("admin");

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) {
    return { status: "error", message: "Invalid script." };
  }

  const row = await rollbackScript(id);
  if (!row) {
    return { status: "error", message: "There is no previous version to restore." };
  }

  await logActivity({
    userId: user.id,
    action: ACTIONS.scriptRolledBack,
    entity: "script",
    entityId: id,
    meta: { name: row.name },
  });

  revalidateScripts();
  return { status: "success", message: "Restored the previous version." };
}

export async function removeScript(
  _prev: ScriptActionState,
  formData: FormData,
): Promise<ScriptActionState> {
  const user = await requireRole("admin");

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) {
    return { status: "error", message: "Invalid script." };
  }

  const removed = await deleteScript(id);
  if (!removed) return { status: "error", message: "Script not found." };

  await logActivity({
    userId: user.id,
    action: ACTIONS.scriptDeleted,
    entity: "script",
    entityId: id,
  });

  revalidateScripts();
  return { status: "success", message: "Script deleted." };
}