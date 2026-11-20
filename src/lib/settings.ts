/**
 * Site settings — cached server reads.
 *
 * The registry (definitions, types, coercion) lives in `settings-registry.ts`
 * and is re-exported here so server code has one import. That split exists
 * because a `"use client"` form needs the definitions but must never import
 * this file: it pulls in `@/db` and therefore `pg`, which fails the build (B1).
 *
 * Caching: reads are wrapped in `unstable_cache` with the `settings` tag
 * (Cache Components is off — D-013). Every admin write calls
 * `revalidateTag("settings", { expire: 0 })`, so the next request is a
 * blocking revalidate and shows the new value immediately.
 */

import { unstable_cache } from "next/cache";
import { db } from "@/db";
import { settings as settingsTable } from "@/db/schema";
import { resolveSettings, type SiteSettings } from "./settings-registry";

export * from "./settings-registry";

/**
 * Cached read. Tagged `settings` so any admin write invalidates it.
 *
 * `revalidate: false` means it never expires on a timer — it changes only when
 * something calls revalidateTag. Settings are small and change rarely; a timer
 * would just add staleness without saving anything.
 */
const readSettings = unstable_cache(
  async (): Promise<SiteSettings> => {
    const rows = await db
      .select({ key: settingsTable.key, value: settingsTable.value })
      .from(settingsTable);
    return resolveSettings(rows);
  },
  ["site-settings"],
  { tags: ["settings"], revalidate: false },
);

export async function getSettings(): Promise<SiteSettings> {
  return readSettings();
}

/**
 * Uncached read for the admin form. The editor must always show what is
 * actually in the database, including a value written a second ago by another
 * tab — never a cached copy.
 */
export async function getSettingsForEdit(): Promise<{
  values: SiteSettings;
  updatedAt: Date | null;
}> {
  const rows = await db
    .select({
      key: settingsTable.key,
      value: settingsTable.value,
      updatedAt: settingsTable.updatedAt,
    })
    .from(settingsTable);

  const latest = rows.reduce<Date | null>((newest, row) => {
    if (!newest || row.updatedAt > newest) return row.updatedAt;
    return newest;
  }, null);

  return { values: resolveSettings(rows), updatedAt: latest };
}
