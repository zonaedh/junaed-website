"use server";

import { randomUUID } from "node:crypto";
import { revalidateTag } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { media as mediaTable } from "@/db/schema";
import { ACTIONS, logActivity } from "@/lib/audit";
import { requireRoleOrThrow, UnauthorizedError } from "@/lib/rbac";
import { processUpload } from "@/lib/media/process";
import { getMediaById, thumbKeyFor } from "@/lib/media/repository";
import { storage } from "@/lib/media/storage";
import { findMediaUsage } from "@/lib/media/usage";
import {
  MAX_UPLOAD_BYTES,
  slugifyFilename,
  type MediaUsage,
} from "@/lib/media/types";

/**
 * Media write path (MVP.md §3.1).
 *
 * Upload, edit metadata, delete. Every action re-checks the role server-side —
 * the hidden UI is cosmetic, this is the control (D-005, rbac.ts).
 */

export type UploadState = {
  status: "idle" | "uploaded" | "error";
  message?: string;
  uploaded?: number;
  failed?: { name: string; reason: string }[];
};

export type MediaEditState = {
  status: "idle" | "saved" | "error";
  message?: string;
  errors?: Record<string, string>;
};

export type DeleteState = {
  status: "idle" | "deleted" | "blocked" | "error";
  message?: string;
  usage?: MediaUsage[];
};

const MAX_ALT = 300;
const MAX_TITLE = 200;
const MAX_CAPTION = 600;

async function requireEditor() {
  try {
    return await requireRoleOrThrow("editor");
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return null;
    }
    throw error;
  }
}

/** Build a collision-free object key: folder/date/slug-random.ext */
function buildKey(name: string, extension: string, folder: string | null): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const slug = slugifyFilename(name);
  const id = randomUUID().slice(0, 8);
  const prefix = folder ? `${slugifyFilename(folder)}/` : "";
  return `${prefix}${year}/${month}/${slug}-${id}.${extension}`;
}

export async function uploadMedia(
  _prev: UploadState,
  formData: FormData,
): Promise<UploadState> {
  const user = await requireEditor();
  if (!user) {
    return { status: "error", message: "Your session has expired. Sign in again." };
  }

  const files = formData.getAll("files").filter((entry): entry is File => entry instanceof File);
  if (files.length === 0) {
    return { status: "error", message: "No files were selected." };
  }

  const rawFolder = formData.get("folder");
  const folder = typeof rawFolder === "string" && rawFolder.trim() ? rawFolder.trim() : null;

  let uploaded = 0;
  const failed: { name: string; reason: string }[] = [];

  for (const file of files) {
    try {
      if (file.size === 0) {
        failed.push({ name: file.name, reason: "File is empty." });
        continue;
      }
      if (file.size > MAX_UPLOAD_BYTES) {
        failed.push({ name: file.name, reason: "Larger than 12 MB." });
        continue;
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const processed = await processUpload(buffer);

      const key = buildKey(file.name, processed.extension, folder);
      const driver = storage();
      const stored = await driver.put(key, processed.body, processed.mime);

      // Thumbnail is a second object under a derived key. A failure here is
      // not fatal: the library falls back to the full image.
      let thumbUrl: string | null = null;
      if (processed.thumb) {
        try {
          const thumb = await driver.put(
            thumbKeyFor(key),
            processed.thumb,
            "image/webp",
          );
          thumbUrl = thumb.url;
        } catch (error) {
          console.error("[media] thumbnail upload failed", error);
        }
      }

      await db.insert(mediaTable).values({
        key,
        // The stored url is the full image; the thumb is derived from the key
        // by convention (thumbKeyFor), so no extra column is needed.
        url: stored.url,
        mime: processed.mime,
        size: processed.body.length,
        width: processed.width,
        height: processed.height,
        title: file.name.replace(/\.[^.]+$/, "").slice(0, MAX_TITLE),
        alt: "",
        folder,
        uploadedBy: user.id,
      });

      uploaded += 1;
      void thumbUrl;
    } catch (error) {
      const reason =
        error instanceof Error ? error.message : "Could not process this file.";
      failed.push({ name: file.name, reason });
      console.error("[media] upload failed", { name: file.name, reason });
    }
  }

  if (uploaded > 0) {
    revalidateTag("media", { expire: 0 });
    await logActivity({
      userId: user.id,
      action: ACTIONS.mediaUploaded,
      entity: "media",
      meta: { count: uploaded, failed: failed.length },
    });
  }

  if (uploaded === 0) {
    return {
      status: "error",
      message:
        failed[0]?.reason ??
        "Nothing was uploaded. Check the file type and size.",
    };
  }

  return {
    status: "uploaded",
    uploaded,
    failed,
    message:
      failed.length === 0
        ? `${uploaded} file${uploaded === 1 ? "" : "s"} uploaded.`
        : `${uploaded} uploaded, ${failed.length} skipped.`,
  };
}

export async function updateMedia(
  mediaId: number,
  _prev: MediaEditState,
  formData: FormData,
): Promise<MediaEditState> {
  const user = await requireEditor();
  if (!user) {
    return { status: "error", message: "Your session has expired. Sign in again." };
  }

  const existing = await getMediaById(mediaId);
  if (!existing) {
    return { status: "error", message: "That image no longer exists." };
  }

  const alt = String(formData.get("alt") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const caption = String(formData.get("caption") ?? "").trim();

  const errors: Record<string, string> = {};
  if (alt.length > MAX_ALT) errors.alt = `Alt text must be ${MAX_ALT} characters or fewer.`;
  if (title.length > MAX_TITLE) errors.title = `Title must be ${MAX_TITLE} characters or fewer.`;
  if (caption.length > MAX_CAPTION) {
    errors.caption = `Caption must be ${MAX_CAPTION} characters or fewer.`;
  }

  if (Object.keys(errors).length > 0) {
    return { status: "error", message: "Some fields need attention.", errors };
  }

  await db
    .update(mediaTable)
    .set({ alt, title, caption, folder: existing.folder })
    .where(eq(mediaTable.id, mediaId));

  revalidateTag("media", { expire: 0 });

  await logActivity({
    userId: user.id,
    action: ACTIONS.mediaUpdated,
    entity: "media",
    entityId: mediaId,
    meta: { fields: ["alt", "title", "caption"] },
  });

  return { status: "saved", message: "Saved." };
}

/**
 * Delete a media item.
 *
 * Blocked while the image is referenced anywhere. The alternative — deleting
 * and letting the page render a gap — is the silent-rot failure this codebase
 * keeps designing against.
 */
export async function deleteMedia(mediaId: number): Promise<DeleteState> {
  const user = await requireEditor();
  if (!user) {
    return { status: "error", message: "Your session has expired. Sign in again." };
  }

  const existing = await getMediaById(mediaId);
  if (!existing) {
    return { status: "error", message: "That image no longer exists." };
  }

  const usage = await findMediaUsage(mediaId);
  if (usage.length > 0) {
    return {
      status: "blocked",
      message: "This image is in use. Remove it from these places first.",
      usage,
    };
  }

  // Soft delete the row, hard delete the objects. A soft-deleted row keeps the
  // audit trail honest while the bytes (the expensive part) are reclaimed.
  await db
    .update(mediaTable)
    .set({ deletedAt: new Date() })
    .where(eq(mediaTable.id, mediaId));

  try {
    const driver = storage();
    await driver.remove(existing.key);
    await driver.remove(thumbKeyFor(existing.key));
  } catch (error) {
    console.error("[media] object delete failed", error);
  }

  revalidateTag("media", { expire: 0 });

  await logActivity({
    userId: user.id,
    action: ACTIONS.mediaDeleted,
    entity: "media",
    entityId: mediaId,
    meta: { key: existing.key },
  });

  return { status: "deleted", message: "Deleted." };
}

/** Usage lookup for the edit panel's "used in…" list. */
export async function mediaUsage(mediaId: number): Promise<MediaUsage[]> {
  const user = await requireEditor();
  if (!user) return [];
  return findMediaUsage(mediaId);
}

/** Count of live media, for the dashboard tile. */
export async function mediaCount(): Promise<number> {
  const rows = await db
    .select({ id: mediaTable.id })
    .from(mediaTable)
    .where(isNull(mediaTable.deletedAt));
  return rows.length;
}

/** Replace an existing item's file in place, keeping the same row and id. */
export async function replaceMediaFile(
  mediaId: number,
  _prev: UploadState,
  formData: FormData,
): Promise<UploadState> {
  const user = await requireEditor();
  if (!user) {
    return { status: "error", message: "Your session has expired. Sign in again." };
  }

  const existing = await getMediaById(mediaId);
  if (!existing) {
    return { status: "error", message: "That image no longer exists." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "Choose a file to replace it with." };
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return { status: "error", message: "Larger than 12 MB." };
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const processed = await processUpload(buffer);
    const driver = storage();

    // Same key: the URL does not change, so every page using this image picks
    // up the new file without being edited. The cache tag handles the CDN.
    await driver.put(existing.key, processed.body, processed.mime);

    if (processed.thumb) {
      await driver
        .put(thumbKeyFor(existing.key), processed.thumb, "image/webp")
        .catch((error) => console.error("[media] thumb replace failed", error));
    }

    await db
      .update(mediaTable)
      .set({
        mime: processed.mime,
        size: processed.body.length,
        width: processed.width,
        height: processed.height,
      })
      .where(and(eq(mediaTable.id, mediaId), isNull(mediaTable.deletedAt)));

    revalidateTag("media", { expire: 0 });

    await logActivity({
      userId: user.id,
      action: ACTIONS.mediaReplaced,
      entity: "media",
      entityId: mediaId,
    });

    return { status: "uploaded", uploaded: 1, message: "File replaced." };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Replace failed.";
    return { status: "error", message: reason };
  }
}
