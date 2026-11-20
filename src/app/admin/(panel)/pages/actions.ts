"use server";

import { revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { pages as pagesTable } from "@/db/schema";
import { ACTIONS, logActivity } from "@/lib/audit";
import { getAdminBase } from "@/lib/admin-path";
import { pageDefinition } from "@/lib/pages";
import { requireRoleOrThrow, UnauthorizedError } from "@/lib/rbac";

/**
 * Page content write path (MVP.md Â§3.3).
 *
 * Same rules as the settings action: role re-checked here, every field
 * validated against its definition, audit records the page and status only,
 * and the cache tag is invalidated so the public page updates.
 *
 * Status is deliberately part of the form. A page that is `draft` renders its
 * defaults on the public site, so an editor can save work in progress without
 * publishing it by accident.
 */

export type PageState = {
  status: "idle" | "saved" | "error";
  message?: string;
  errors?: Record<string, string>;
};

export async function savePage(
  pageKey: string,
  _prevState: PageState,
  formData: FormData,
): Promise<PageState> {
  const definition = pageDefinition(pageKey);
  if (!definition) {
    return { status: "error", message: "Unknown page." };
  }

  let user;
  try {
    user = await requireRoleOrThrow("editor");
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { status: "error", message: error.message };
    }
    throw error;
  }

  const errors: Record<string, string> = {};
  const content: Record<string, string> = {};

  for (const field of definition.fields) {
    const raw = formData.get(field.key);
    const text = typeof raw === "string" ? raw.trim() : "";

    // Image fields store a media id, not a URL. Empty is valid ("no image").
    if (field.kind === "image") {
      if (text !== "" && !/^\d+$/.test(text)) {
        errors[field.key] = `${field.label} must be chosen from the media library.`;
        continue;
      }
      content[field.key] = text;
      continue;
    }

    if (text.length > field.maxLength) {
      errors[field.key] = `${field.label} must be ${field.maxLength} characters or fewer.`;
      continue;
    }

    content[field.key] = text;
  }

  const rawStatus = String(formData.get("status") ?? "draft");
  const allowedStatuses = ["draft", "published", "archived"] as const;
  const status = (allowedStatuses as readonly string[]).includes(rawStatus)
    ? (rawStatus as (typeof allowedStatuses)[number])
    : "draft";

  if (Object.keys(errors).length > 0) {
    return {
      status: "error",
      message: "Some fields need attention before this can be saved.",
      errors,
    };
  }

  try {
    await db
      .insert(pagesTable)
      .values({
        key: definition.key,
        title: definition.name,
        content,
        status,
        updatedBy: user.id,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: pagesTable.key,
        set: {
          content,
          status,
          updatedBy: user.id,
          updatedAt: new Date(),
        },
      });
  } catch (error) {
    console.error("[pages] save failed", error);
    return {
      status: "error",
      message: "Could not save this page. Please try again.",
    };
  }

  // Both tags: the page itself, and the collection the admin list reads.
  revalidateTag(`page:${definition.key}`, { expire: 0 });
  revalidateTag("pages", { expire: 0 });

  await logActivity({
    userId: user.id,
    action: ACTIONS.pageUpdated,
    entity: "page",
    entityId: definition.key,
    meta: { status, fields: Object.keys(content).length },
  });

  return {
    status: "saved",
    message:
      status === "published"
        ? "Page published. The public site is updated."
        : "Saved as draft. The public site still shows the previous published content.",
  };
}

/** Convenience action for the list screen's publish/unpublish toggle. */
export async function setPageStatus(
  pageKey: string,
  status: "draft" | "published",
): Promise<void> {
  const definition = pageDefinition(pageKey);
  if (!definition) return;

  const user = await requireRoleOrThrow("editor");

  await db
    .insert(pagesTable)
    .values({
      key: definition.key,
      title: definition.name,
      content: {},
      status,
      updatedBy: user.id,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: pagesTable.key,
      set: { status, updatedBy: user.id, updatedAt: new Date() },
    });

  revalidateTag(`page:${definition.key}`, { expire: 0 });
  revalidateTag("pages", { expire: 0 });

  await logActivity({
    userId: user.id,
    action: ACTIONS.pageUpdated,
    entity: "page",
    entityId: definition.key,
    meta: { status },
  });

  redirect(`${await getAdminBase()}/pages`);
}
