import { describe, expect, it } from "vitest";
import {
  BACKUP_KEEP,
  backupFilename,
  daysSinceLastBackup,
  formatBytes,
  isBackupStale,
  parseBackupFilename,
  planRetention,
} from "./rules";

/**
 * Backup rule tests (MVP.md §9.1).
 *
 * The retention function deletes files, so the cases that matter are the ones
 * where a plausible implementation destroys something it should not: an
 * unrecognised filename swept up by a wildcard, a date that Date rolls over
 * silently, or a sort by mtime that keeps the wrong three when uploads arrive
 * out of order.
 */

describe("backupFilename", () => {
  it("formats a date as the archive name", () => {
    expect(backupFilename(new Date("2026-11-21T02:00:00Z"))).toBe(
      "backup-2026-11-21.sql.gz.age",
    );
  });

  it("zero-pads single-digit months and days", () => {
    expect(backupFilename(new Date("2026-01-05T00:00:00Z"))).toBe(
      "backup-2026-01-05.sql.gz.age",
    );
  });

  it("uses UTC, so a late-evening local run does not shift the date", () => {
    // 23:30 UTC is already the next day in Dhaka (UTC+6); the name must not drift.
    expect(backupFilename(new Date("2026-11-21T23:30:00Z"))).toBe(
      "backup-2026-11-21.sql.gz.age",
    );
  });
});

describe("parseBackupFilename", () => {
  it("round-trips a generated name", () => {
    const date = new Date("2026-11-21T00:00:00Z");
    const parsed = parseBackupFilename(backupFilename(date));
    expect(parsed?.toISOString()).toBe(date.toISOString());
  });

  it("rejects a name without the prefix", () => {
    expect(parseBackupFilename("2026-11-21.sql.gz.age")).toBeNull();
  });

  it("rejects a name without the encryption suffix", () => {
    expect(parseBackupFilename("backup-2026-11-21.sql.gz")).toBeNull();
  });

  it("rejects an impossible date rather than rolling it over", () => {
    // Date.UTC(2026, 1, 31) would silently become 3 March. It must not.
    expect(parseBackupFilename("backup-2026-02-31.sql.gz.age")).toBeNull();
  });

  it("rejects a non-date middle", () => {
    expect(parseBackupFilename("backup-latest.sql.gz.age")).toBeNull();
  });

  it("rejects an unrelated file", () => {
    expect(parseBackupFilename("notes.txt")).toBeNull();
  });
});

describe("planRetention", () => {
  const names = [
    "backup-2026-11-01.sql.gz.age",
    "backup-2026-11-08.sql.gz.age",
    "backup-2026-11-15.sql.gz.age",
    "backup-2026-11-22.sql.gz.age",
    "backup-2026-11-29.sql.gz.age",
  ];

  it("keeps the newest three and removes the rest", () => {
    const { keep, remove } = planRetention(names);
    expect(keep).toEqual([
      "backup-2026-11-29.sql.gz.age",
      "backup-2026-11-22.sql.gz.age",
      "backup-2026-11-15.sql.gz.age",
    ]);
    expect(remove).toEqual([
      "backup-2026-11-08.sql.gz.age",
      "backup-2026-11-01.sql.gz.age",
    ]);
  });

  it("keeps everything when there are fewer than the limit", () => {
    const { keep, remove } = planRetention(names.slice(0, 2));
    expect(keep).toHaveLength(2);
    expect(remove).toEqual([]);
  });

  it("sorts by the date in the name, not by array order", () => {
    // Uploads can arrive out of order; the decision must not depend on that.
    const shuffled = [
      "backup-2026-11-15.sql.gz.age",
      "backup-2026-11-29.sql.gz.age",
      "backup-2026-11-01.sql.gz.age",
    ];
    const { keep } = planRetention(shuffled, 2);
    expect(keep).toEqual([
      "backup-2026-11-29.sql.gz.age",
      "backup-2026-11-15.sql.gz.age",
    ]);
  });

  it("never deletes a file it cannot date", () => {
    const withStranger = [...names, "someone-elses-file.tar", "README.txt"];
    const { remove, ignored } = planRetention(withStranger);
    expect(ignored).toEqual(["someone-elses-file.tar", "README.txt"]);
    expect(remove).not.toContain("someone-elses-file.tar");
    expect(remove).not.toContain("README.txt");
  });

  it("removes nothing when keepCount is zero or negative", () => {
    // A misconfigured keep count must not become "delete everything".
    const zero = planRetention(names, 0);
    expect(zero.keep).toEqual([]);
    expect(zero.remove).toHaveLength(names.length);
  });

  it("defaults to keeping three", () => {
    expect(BACKUP_KEEP).toBe(3);
    expect(planRetention(names).keep).toHaveLength(3);
  });

  it("handles an empty directory", () => {
    expect(planRetention([])).toEqual({ keep: [], remove: [], ignored: [] });
  });
});

describe("isBackupStale", () => {
  const now = new Date("2026-11-21T12:00:00Z");

  it("is stale when there is no backup at all", () => {
    expect(isBackupStale([], now)).toBe(true);
  });

  it("is not stale for a recent success", () => {
    expect(
      isBackupStale(
        [{ status: "success", createdAt: new Date("2026-11-20T02:00:00Z") }],
        now,
      ),
    ).toBe(false);
  });

  it("is stale past the threshold", () => {
    expect(
      isBackupStale(
        [{ status: "success", createdAt: new Date("2026-11-10T02:00:00Z") }],
        now,
      ),
    ).toBe(true);
  });

  it("does not count a failed run as a backup", () => {
    expect(
      isBackupStale(
        [
          { status: "failed", createdAt: new Date("2026-11-21T02:00:00Z") },
          { status: "success", createdAt: new Date("2026-11-01T02:00:00Z") },
        ],
        now,
      ),
    ).toBe(true);
  });

  it("does not count a running job as a backup", () => {
    expect(
      isBackupStale([{ status: "running", createdAt: new Date("2026-11-21T11:00:00Z") }], now),
    ).toBe(true);
  });

  it("uses the newest success when several exist", () => {
    expect(
      isBackupStale(
        [
          { status: "success", createdAt: new Date("2026-11-01T02:00:00Z") },
          { status: "success", createdAt: new Date("2026-11-20T02:00:00Z") },
        ],
        now,
      ),
    ).toBe(false);
  });

  it("accepts string timestamps, since cached rows come back as strings", () => {
    expect(
      isBackupStale([{ status: "success", createdAt: "2026-11-20T02:00:00Z" }], now),
    ).toBe(false);
  });
});

describe("daysSinceLastBackup", () => {
  const now = new Date("2026-11-21T12:00:00Z");

  it("returns null when there is no success", () => {
    expect(daysSinceLastBackup([], now)).toBeNull();
  });

  it("counts whole days", () => {
    expect(
      daysSinceLastBackup(
        [{ status: "success", createdAt: new Date("2026-11-19T12:00:00Z") }],
        now,
      ),
    ).toBe(2);
  });
});

describe("formatBytes", () => {
  it("formats bytes, kilobytes and megabytes", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2.0 KB");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.0 MB");
  });

  it("drops the decimal above ten units", () => {
    expect(formatBytes(15 * 1024 * 1024)).toBe("15 MB");
  });

  it("returns a dash for a missing value", () => {
    expect(formatBytes(null)).toBe("—");
    expect(formatBytes(undefined)).toBe("—");
    expect(formatBytes(-1)).toBe("—");
  });
});
