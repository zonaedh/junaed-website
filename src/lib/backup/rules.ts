/**
 * Backup rules — pure logic, no I/O.
 *
 * MVP.md §9.1. The retention rule is the one that can destroy data, so it lives
 * here as a pure function with tests rather than inside a shell script where a
 * glob typo silently deletes the wrong thing.
 *
 * The contract: keep the newest N by date, delete the rest. "Newest" is decided
 * by the date *in the filename*, not by mtime, because SFTP uploads can arrive
 * out of order and an mtime sort would then keep the wrong three.
 */

/** The archive naming contract, shared by the workflow and the admin page. */
export const BACKUP_PREFIX = "backup-";
export const BACKUP_SUFFIX = ".sql.gz.age";

/** How many archives are kept. Older ones are hard-deleted. */
export const BACKUP_KEEP = 3;

/** Alert when no successful backup has landed in this many days. */
export const BACKUP_STALE_DAYS = 8;

/** A backup older than this is not a backup, it is a hope. */
export const BACKUP_STALE_MS = BACKUP_STALE_DAYS * 24 * 60 * 60 * 1000;

/**
 * Build the filename for a given day.
 * `backup-2026-11-21.sql.gz.age`
 */
export function backupFilename(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${BACKUP_PREFIX}${y}-${m}-${d}${BACKUP_SUFFIX}`;
}

/**
 * Parse the date out of a backup filename.
 *
 * Returns null for anything that does not match the contract exactly. This is
 * deliberate: the retention step must never delete a file it does not
 * recognise, because "unrecognised" might mean "someone else's file".
 */
export function parseBackupFilename(name: string): Date | null {
  if (!name.startsWith(BACKUP_PREFIX) || !name.endsWith(BACKUP_SUFFIX)) {
    return null;
  }
  const middle = name.slice(BACKUP_PREFIX.length, name.length - BACKUP_SUFFIX.length);
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(middle);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const date = new Date(Date.UTC(year, month - 1, day));
  // Reject impossible dates that Date would silently roll over (2026-02-31).
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

export type RetentionDecision = {
  /** Filenames to keep, newest first. */
  keep: string[];
  /** Filenames to hard-delete. */
  remove: string[];
  /** Files that did not match the naming contract and are left untouched. */
  ignored: string[];
};

/**
 * Decide what to keep.
 *
 * Only files matching the contract are ever considered for deletion. Anything
 * unrecognised goes to `ignored` and is left alone — the retention step has no
 * business deleting a file it cannot date.
 */
export function planRetention(
  filenames: readonly string[],
  keepCount = BACKUP_KEEP,
): RetentionDecision {
  const dated: { name: string; date: Date }[] = [];
  const ignored: string[] = [];

  for (const name of filenames) {
    const date = parseBackupFilename(name);
    if (date) dated.push({ name, date });
    else ignored.push(name);
  }

  // Newest first. Ties break on the name so the result is deterministic.
  dated.sort((a, b) => {
    const diff = b.date.getTime() - a.date.getTime();
    return diff !== 0 ? diff : a.name.localeCompare(b.name);
  });

  const keep = dated.slice(0, Math.max(0, keepCount)).map((entry) => entry.name);
  const remove = dated.slice(Math.max(0, keepCount)).map((entry) => entry.name);

  return { keep, remove, ignored };
}

export type BackupRecord = {
  status: "running" | "success" | "failed";
  createdAt: Date | string;
};

/**
 * Is the backup set stale?
 *
 * True when there is no successful backup, or the newest successful one is
 * older than the threshold. A `running` or `failed` row does not count as a
 * backup — only a success does.
 */
export function isBackupStale(
  records: readonly BackupRecord[],
  now: Date = new Date(),
  staleMs = BACKUP_STALE_MS,
): boolean {
  let newest: number | null = null;

  for (const record of records) {
    if (record.status !== "success") continue;
    const time =
      record.createdAt instanceof Date
        ? record.createdAt.getTime()
        : new Date(record.createdAt).getTime();
    if (Number.isNaN(time)) continue;
    if (newest === null || time > newest) newest = time;
  }

  if (newest === null) return true;
  return now.getTime() - newest > staleMs;
}

/** Whole days since the newest successful backup, or null if there is none. */
export function daysSinceLastBackup(
  records: readonly BackupRecord[],
  now: Date = new Date(),
): number | null {
  let newest: number | null = null;
  for (const record of records) {
    if (record.status !== "success") continue;
    const time =
      record.createdAt instanceof Date
        ? record.createdAt.getTime()
        : new Date(record.createdAt).getTime();
    if (Number.isNaN(time)) continue;
    if (newest === null || time > newest) newest = time;
  }
  if (newest === null) return null;
  return Math.floor((now.getTime() - newest) / (24 * 60 * 60 * 1000));
}

/** Human-readable size. Returns "—" for a missing or nonsensical value. */
export function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null || !Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unit]}`;
}
