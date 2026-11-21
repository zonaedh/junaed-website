/**
 * Backup repository (MVP.md §9.1).
 *
 * SERVER ONLY.
 *
 * The workflow writes rows; the admin page reads them. The page is the only
 * reader, so it uses `unstable_cache` under the `backups` tag and the run
 * action revalidates that tag. Nothing here is on a request path that needs to
 * be fast, so a plain query would also be fine — the cache exists so the page
 * does not hit the database on every render of a rarely-changing table.
 *
 * `unstable_cache` serialises its result, so timestamps come back as strings
 * (D-031). They are typed as strings here and formatted at the call site.
 */

import { desc, eq } from "drizzle-orm";
import { unstable_cache } from "next/cache";
import { db } from "@/db";
import { backupsLog } from "@/db/schema";
import { ACTIONS, logActivity } from "@/lib/audit";
import { BACKUP_STALE_DAYS, isBackupStale } from "@/lib/backup/rules";

/** A row as the admin page consumes it: dates already serialised to strings. */
export type BackupRow = {
  id: number;
  filename: string;
  size: number | null;
  status: "running" | "success" | "failed";
  message: string | null;
  createdAt: string;
};

export const BACKUPS_TAG = "backups";

/**
 * The most recent backups, newest first.
 *
 * Cached under the `backups` tag. The workflow inserts rows directly, so a row
 * written by GitHub Actions will not appear until the tag is revalidated or the
 * cache expires — the page says so rather than pretending to be live.
 */
export const listRecentBackups = unstable_cache(
  async (limit = 10): Promise<BackupRow[]> => {
    const rows = await db
      .select()
      .from(backupsLog)
      .orderBy(desc(backupsLog.createdAt))
      .limit(limit);

    return rows.map((row) => ({
      id: row.id,
      filename: row.filename,
      size: row.size,
      status: row.status,
      message: row.message,
      createdAt: row.createdAt.toISOString(),
    }));
  },
  ["backups-recent"],
  { tags: [BACKUPS_TAG], revalidate: 300 },
);

export type BackupHealth = {
  stale: boolean;
  lastSuccessAt: string | null;
  staleAfterDays: number;
};

/** Whether the backup set has gone quiet, for the banner on the page. */
export async function getBackupHealth(): Promise<BackupHealth> {
  const rows = await listRecentBackups(20);
  const stale = isBackupStale(
    rows.map((row) => ({ status: row.status, createdAt: row.createdAt })),
  );
  const lastSuccess = rows.find((row) => row.status === "success") ?? null;

  return {
    stale,
    lastSuccessAt: lastSuccess?.createdAt ?? null,
    staleAfterDays: BACKUP_STALE_DAYS,
  };
}

export type RecordBackupInput = {
  filename: string;
  size?: number | null;
  status: "running" | "success" | "failed";
  message?: string | null;
};

/**
 * Record a backup run.
 *
 * Used by the admin "run now" action to write the `running` row immediately, so
 * the owner sees that something started even if the workflow later fails. The
 * workflow itself writes its own final row.
 */
export async function recordBackup(input: RecordBackupInput): Promise<number> {
  const [row] = await db
    .insert(backupsLog)
    .values({
      filename: input.filename.slice(0, 260),
      size: input.size ?? null,
      status: input.status,
      message: input.message ?? null,
    })
    .returning({ id: backupsLog.id });

  return row.id;
}

/**
 * Mark a run as failed.
 *
 * Called when the dispatch itself could not be made, so the log does not keep a
 * `running` row that will never finish.
 */
export async function markBackupFailed(id: number, message: string): Promise<void> {
  await db
    .update(backupsLog)
    .set({ status: "failed", message: message.slice(0, 2000) })
    .where(eq(backupsLog.id, id));
}

/** Log a manual dispatch attempt in the activity log. */
export async function logBackupDispatch(input: {
  userId: number;
  ipHash: string | null;
  ok: boolean;
  detail: string;
}): Promise<void> {
  await logActivity({
    userId: input.userId,
    action: input.ok ? ACTIONS.backupRequested : ACTIONS.backupFailed,
    entity: "backups_log",
    meta: { detail: input.detail },
    ipHash: input.ipHash,
  });
}
