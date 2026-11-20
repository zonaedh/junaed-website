/**
 * Media usage tracking.
 *
 * SERVER ONLY.
 *
 * "Used in…" is not a nice-to-have. An image field stores a media id, so
 * deleting an image that a page points at leaves that page rendering a gap
 * with no error anywhere — exactly the silent-rot failure D-025 was written to
 * prevent. So before a delete is allowed, every place an id can be referenced
 * is checked, and the editor is told where.
 *
 * The scan is registry-driven for pages: any field of kind `image` counts.
 * Adding an image field therefore makes it usage-tracked automatically.
 */

import { and, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  media as mediaTable,
  pages as pagesTable,
  portfolioItems,
  posts,
  settings as settingsTable,
} from "@/db/schema";
import { PAGE_DEFINITIONS } from "@/lib/pages-definitions";
import { SETTING_DEFINITIONS } from "@/lib/settings-registry";
import { getAdminBase } from "@/lib/admin-path";
import type { MediaUsage } from "./types";

/** Settings whose value is a media id. */
const IMAGE_SETTING_KEYS = SETTING_DEFINITIONS.filter(
  (definition) => (definition as { kind: string }).kind === "image",
).map((definition) => definition.key);

export async function findMediaUsage(mediaId: number): Promise<MediaUsage[]> {
  const base = await getAdminBase();
  const id = String(mediaId);
  const usage: MediaUsage[] = [];

  // ---- pages: any field declared as an image ----
  const pageRows = await db
    .select({ key: pagesTable.key, content: pagesTable.content })
    .from(pagesTable);

  for (const row of pageRows) {
    const definition = PAGE_DEFINITIONS.find((item) => item.key === row.key);
    if (!definition) continue;

    for (const field of definition.fields) {
      if (field.kind !== "image") continue;
      const stored = (row.content as Record<string, unknown> | null)?.[field.key];
      if (String(stored ?? "") === id) {
        usage.push({
          label: `${definition.name} — ${field.label}`,
          href: `${base}/pages/${definition.key}`,
        });
      }
    }
  }

  // ---- settings: logo, favicon, default OG image ----
  if (IMAGE_SETTING_KEYS.length > 0) {
    const settingRows = await db
      .select({ key: settingsTable.key, value: settingsTable.value })
      .from(settingsTable);

    for (const row of settingRows) {
      if (!IMAGE_SETTING_KEYS.includes(row.key)) continue;
      if (String(row.value ?? "") === id) {
        usage.push({
          label: `Settings — ${row.key}`,
          href: `${base}/settings`,
        });
      }
    }
  }

  // ---- posts: cover and OG image ----
  const postRows = await db
    .select({ id: posts.id, title: posts.title })
    .from(posts)
    .where(
      and(
        isNull(posts.deletedAt),
        sql`(${posts.coverMediaId} = ${mediaId} OR ${posts.ogImageId} = ${mediaId})`,
      ),
    );

  for (const row of postRows) {
    usage.push({
      label: `Post — ${row.title}`,
      href: `${base}/posts/${row.id}`,
    });
  }

  // ---- portfolio: cover, OG image, gallery ----
  const portfolioRows = await db
    .select({
      id: portfolioItems.id,
      title: portfolioItems.title,
      gallery: portfolioItems.gallery,
      coverMediaId: portfolioItems.coverMediaId,
      ogImageId: portfolioItems.ogImageId,
    })
    .from(portfolioItems)
    .where(isNull(portfolioItems.deletedAt));

  for (const row of portfolioRows) {
    const gallery = Array.isArray(row.gallery) ? row.gallery : [];
    const inCover = row.coverMediaId === mediaId || row.ogImageId === mediaId;
    const inGallery = gallery.includes(mediaId);

    if (inCover) {
      usage.push({
        label: `Portfolio — ${row.title}`,
        href: `${base}/portfolio/${row.id}`,
      });
    } else if (inGallery) {
      usage.push({
        label: `Portfolio gallery — ${row.title}`,
        href: `${base}/portfolio/${row.id}`,
      });
    }
  }

  return usage;
}

/** Convenience for the delete guard. */
export async function isMediaInUse(mediaId: number): Promise<boolean> {
  const usage = await findMediaUsage(mediaId);
  return usage.length > 0;
}

/** Media ids referenced by a page's image fields, for cache invalidation. */
export function pageImageIds(content: Record<string, unknown> | null): number[] {
  if (!content) return [];
  const ids: number[] = [];
  for (const definition of PAGE_DEFINITIONS) {
    for (const field of definition.fields) {
      if (field.kind !== "image") continue;
      const value = Number(content[field.key]);
      if (Number.isFinite(value) && value > 0) ids.push(value);
    }
  }
  return ids;
}

/** Soft-delete marker used by every query in this module. */
export const NOT_DELETED = isNull(mediaTable.deletedAt);
