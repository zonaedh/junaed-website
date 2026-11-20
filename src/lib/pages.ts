/**
 * Editable page content — cached server reads.
 *
 * The definitions (field lists, defaults, coercion) live in
 * `pages-definitions.ts` and are re-exported here so server code has one
 * import. That split exists because a `"use client"` form needs the
 * definitions but must never import this file: it pulls in `@/db` and
 * therefore `pg`, which fails the build (B1).
 */

import { unstable_cache } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { pages as pagesTable } from "@/db/schema";
import {
  defaultPageContent,
  PAGE_DEFINITIONS,
  resolvePageContent,
  type PageContent,
} from "./pages-definitions";

export * from "./pages-definitions";

export type PageRecord = {
  key: string;
  title: string;
  content: PageContent;
  status: "draft" | "scheduled" | "published" | "archived";
  updatedAt: Date | null;
};

/**
 * Cached read of one page. Tagged `pages` AND `page:<key>` so a single page
 * edit does not have to invalidate every other page.
 */
function readPage(key: string) {
  return unstable_cache(
    async (): Promise<PageRecord | null> => {
      const rows = await db
        .select()
        .from(pagesTable)
        .where(eq(pagesTable.key, key))
        .limit(1);

      const row = rows[0];
      if (!row) return null;

      return {
        key: row.key,
        title: row.title,
        content: resolvePageContent(key, row.content),
        status: row.status,
        updatedAt: row.updatedAt,
      };
    },
    ["page", key],
    { tags: ["pages", `page:${key}`], revalidate: false },
  )();
}

/**
 * Public read. Returns the page content, falling back to the defaults when the
 * row does not exist yet — so the site renders on a database that has been
 * migrated but not seeded.
 *
 * A page that is not `published` renders its defaults on the public site, so a
 * draft edit never leaks to visitors.
 */
export async function getPageContent(key: string): Promise<PageContent> {
  const record = await readPage(key);
  if (!record) return defaultPageContent(key);
  if (record.status !== "published") return defaultPageContent(key);
  return record.content;
}

/** Uncached read for the admin editor: always the real row. */
export async function getPageForEdit(key: string): Promise<{
  content: PageContent;
  status: PageRecord["status"];
  exists: boolean;
  updatedAt: Date | null;
}> {
  const rows = await db
    .select()
    .from(pagesTable)
    .where(eq(pagesTable.key, key))
    .limit(1);

  const row = rows[0];
  if (!row) {
    return {
      content: defaultPageContent(key),
      status: "draft",
      exists: false,
      updatedAt: null,
    };
  }

  return {
    content: resolvePageContent(key, row.content),
    status: row.status,
    exists: true,
    updatedAt: row.updatedAt,
  };
}

/** Summary for the admin list. Uncached — it is an editor screen. */
export async function listPagesForAdmin(): Promise<
  {
    key: string;
    title: string;
    status: PageRecord["status"];
    updatedAt: Date | null;
  }[]
> {
  const rows = await db
    .select({
      key: pagesTable.key,
      title: pagesTable.title,
      status: pagesTable.status,
      updatedAt: pagesTable.updatedAt,
    })
    .from(pagesTable);

  const byKey = new Map(rows.map((row) => [row.key, row]));

  return PAGE_DEFINITIONS.map((definition) => {
    const row = byKey.get(definition.key);
    return {
      key: definition.key,
      title: row?.title ?? definition.name,
      status: row?.status ?? "draft",
      updatedAt: row?.updatedAt ?? null,
    };
  });
}
