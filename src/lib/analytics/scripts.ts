/**
 * Custom scripts repository (MVP.md Â§7.2).
 *
 * SERVER ONLY.
 *
 * Scripts are the most dangerous thing in this admin: arbitrary code injected
 * into every page. Three rules keep that contained:
 *
 *  1. Only owner/admin may write (enforced in the action, not here).
 *  2. The previous version is kept on every update, so a bad paste is one
 *     click from being undone.
 *  3. The active set is cached under its own tag, so an edit takes effect on
 *     the next request rather than after a restart.
 */

import { unstable_cache } from "next/cache";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { scripts } from "@/db/schema";

// Pure rules live in `script-rules.ts` (client safe). Import them from there,
// never from this file: this module pulls in the Postgres driver and would
// break any client component that touched it.

export type ScriptRow = typeof scripts.$inferSelect;
export type ScriptLocation = (typeof scripts.location.enumValues)[number];

export type ActiveScript = {
  id: number;
  name: string;
  location: ScriptLocation;
  code: string;
  pageScope: string[] | null;
};

/**
 * The scripts that should render, cached.
 *
 * Only active rows are returned; scoping is applied at render time because it
 * depends on the current path.
 */
const readActiveScripts = unstable_cache(
  async (): Promise<ActiveScript[]> => {
    const rows = await db
      .select({
        id: scripts.id,
        name: scripts.name,
        location: scripts.location,
        code: scripts.code,
        pageScope: scripts.pageScope,
      })
      .from(scripts)
      .where(eq(scripts.isActive, true))
      .orderBy(asc(scripts.id));

    return rows;
  },
  ["active-scripts"],
  { tags: ["scripts"], revalidate: false },
);

export async function getActiveScripts(): Promise<ActiveScript[]> {
  return readActiveScripts();
}

/** Uncached list for the admin table. */
export async function listScripts(): Promise<ScriptRow[]> {
  return db.select().from(scripts).orderBy(desc(scripts.createdAt));
}

export async function createScript(input: {
  name: string;
  location: ScriptLocation;
  code: string;
  pageScope: string[] | null;
  isActive: boolean;
  createdBy: number | null;
}): Promise<ScriptRow> {
  const [row] = await db
    .insert(scripts)
    .values({
      name: input.name,
      location: input.location,
      code: input.code,
      pageScope: input.pageScope,
      isActive: input.isActive,
      createdBy: input.createdBy,
    })
    .returning();
  return row;
}

/**
 * Update a script, keeping the previous code for rollback.
 *
 * `previousCode` is only overwritten when the code actually changed, so
 * toggling a script on and off does not destroy the last real version.
 */
export async function updateScript(
  id: number,
  input: {
    name?: string;
    location?: ScriptLocation;
    code?: string;
    pageScope?: string[] | null;
    isActive?: boolean;
  },
): Promise<ScriptRow | null> {
  const [existing] = await db.select().from(scripts).where(eq(scripts.id, id)).limit(1);
  if (!existing) return null;

  const codeChanged = input.code !== undefined && input.code !== existing.code;

  const [row] = await db
    .update(scripts)
    .set({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.location !== undefined ? { location: input.location } : {}),
      ...(input.code !== undefined ? { code: input.code } : {}),
      ...(input.pageScope !== undefined ? { pageScope: input.pageScope } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      ...(codeChanged ? { previousCode: existing.code } : {}),
    })
    .where(eq(scripts.id, id))
    .returning();
  return row ?? null;
}

/** Restore the previous code. Returns null when there is nothing to restore. */
export async function rollbackScript(id: number): Promise<ScriptRow | null> {
  const [existing] = await db.select().from(scripts).where(eq(scripts.id, id)).limit(1);
  if (!existing || !existing.previousCode) return null;

  const [row] = await db
    .update(scripts)
    .set({ code: existing.previousCode, previousCode: existing.code })
    .where(eq(scripts.id, id))
    .returning();
  return row ?? null;
}

export async function deleteScript(id: number): Promise<boolean> {
  const rows = await db
    .delete(scripts)
    .where(eq(scripts.id, id))
    .returning({ id: scripts.id });
  return rows.length > 0;
}
