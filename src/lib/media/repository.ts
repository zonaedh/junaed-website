/**
 * Media repository — database reads and writes.
 *
 * SERVER ONLY. Importing this pulls `@/db` and therefore `pg`, so a
 * `"use client"` file must import `./types` instead (B1, B11).
 */

import { unstable_cache } from "next/cache";
import { and, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { media as mediaTable } from "@/db/schema";
import type { MediaItem } from "./types";

export type MediaRow = typeof mediaTable.$inferSelect;

/** The thumbnail key is derived, not stored: one convention, no extra column. */
export function thumbKeyFor(key: string): string {
  const dot = key.lastIndexOf(".");
  if (dot === -1) return `${key}.thumb.webp`;
  return `${key.slice(0, dot)}.thumb.webp`;
}

export function toMediaItem(row: MediaRow): MediaItem {
  const isImage = row.mime.startsWith("image/");
  return {
    id: row.id,
    key: row.key,
    url: row.url,
    thumbUrl: isImage ? row.url.replace(/(\.[^.]+)$/, ".thumb.webp") : null,
    mime: row.mime,
    size: row.size,
    width: row.width,
    height: row.height,
    alt: row.alt ?? "",
    title: row.title ?? "",
    caption: row.caption ?? "",
    folder: row.folder,
    createdAt: row.createdAt.toISOString(),
  };
}

export type MediaQuery = {
  search?: string;
  type?: "image" | "document" | "all";
  limit?: number;
};

/**
 * Cached list for the picker and the library grid.
 *
 * Tagged `media` so an upload or delete invalidates it. The admin library
 * itself reads uncached (see listMediaForAdmin) because an editor must always
 * see the real row; this cached form exists for the public site's image
 * resolution.
 */
export async function listMedia(query: MediaQuery = {}): Promise<MediaItem[]> {
  const { search, type = "all", limit = 200 } = query;

  const conditions = [isNull(mediaTable.deletedAt)];

  if (search && search.trim()) {
    const term = `%${search.trim()}%`;
    conditions.push(
      or(
        ilike(mediaTable.title, term),
        ilike(mediaTable.alt, term),
        ilike(mediaTable.key, term),
      )!,
    );
  }

  if (type === "image") {
    conditions.push(sql`${mediaTable.mime} LIKE 'image/%'`);
  } else if (type === "document") {
    conditions.push(sql`${mediaTable.mime} NOT LIKE 'image/%'`);
  }

  const rows = await db
    .select()
    .from(mediaTable)
    .where(and(...conditions))
    .orderBy(desc(mediaTable.createdAt))
    .limit(limit);

  return rows.map(toMediaItem);
}

/** Uncached — the admin library and picker must never show a stale row. */
export async function listMediaForAdmin(
  query: MediaQuery = {},
): Promise<MediaItem[]> {
  return listMedia(query);
}

export async function getMediaById(id: number): Promise<MediaRow | null> {
  const rows = await db
    .select()
    .from(mediaTable)
    .where(and(eq(mediaTable.id, id), isNull(mediaTable.deletedAt)))
    .limit(1);
  return rows[0] ?? null;
}

/**
 * Resolve a media id to a public URL, cached.
 *
 * Every image field stores an id, not a URL. That means replacing a file in
 * the library updates every page using it, and a deleted image resolves to
 * null instead of a broken link.
 */
const resolveUrlCached = unstable_cache(
  async (id: number): Promise<string | null> => {
    const rows = await db
      .select({ url: mediaTable.url, deletedAt: mediaTable.deletedAt })
      .from(mediaTable)
      .where(eq(mediaTable.id, id))
      .limit(1);
    const row = rows[0];
    if (!row || row.deletedAt) return null;
    return row.url;
  },
  ["media-url"],
  { tags: ["media"], revalidate: false },
);

export async function resolveMediaUrl(id: number | null): Promise<string | null> {
  if (!id) return null;
  return resolveUrlCached(id);
}

export type MediaAsset = { url: string; alt: string };

/**
 * Resolve a media id to everything an <Image> needs.
 *
 * The alt text must come from the media library, not from whatever copy
 * happens to sit near the image on the page. An editor writes it once, for
 * that image, and it follows the image everywhere it is used.
 */
const resolveAssetCached = unstable_cache(
  async (id: number): Promise<MediaAsset | null> => {
    const rows = await db
      .select({
        url: mediaTable.url,
        alt: mediaTable.alt,
        title: mediaTable.title,
        deletedAt: mediaTable.deletedAt,
      })
      .from(mediaTable)
      .where(eq(mediaTable.id, id))
      .limit(1);
    const row = rows[0];
    if (!row || row.deletedAt) return null;
    return { url: row.url, alt: row.alt?.trim() || row.title?.trim() || "" };
  },
  ["media-asset"],
  { tags: ["media"], revalidate: false },
);

export async function resolveMediaAsset(
  id: number | null,
): Promise<MediaAsset | null> {
  if (!id) return null;
  return resolveAssetCached(id);
}

/** Batch resolve, so a gallery does not issue one query per image. */
export async function resolveMediaUrls(
  ids: number[],
): Promise<Map<number, string>> {
  const unique = [...new Set(ids.filter((id) => Number.isFinite(id)))];
  const map = new Map<number, string>();
  if (unique.length === 0) return map;

  const rows = await db
    .select({ id: mediaTable.id, url: mediaTable.url })
    .from(mediaTable)
    .where(and(isNull(mediaTable.deletedAt), sql`${mediaTable.id} = ANY(${unique})`));

  for (const row of rows) map.set(row.id, row.url);
  return map;
}

export async function countMedia(): Promise<number> {
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(mediaTable)
    .where(isNull(mediaTable.deletedAt));
  return rows[0]?.count ?? 0;
}
