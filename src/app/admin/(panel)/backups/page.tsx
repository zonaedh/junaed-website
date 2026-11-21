import type { Metadata } from "next";
import { requireRole } from "@/lib/rbac";
import {
  BACKUP_KEEP,
  BACKUP_STALE_DAYS,
  daysSinceLastBackup,
  formatBytes,
} from "@/lib/backup/rules";
import { getBackupHealth, listRecentBackups } from "@/lib/backup/repository";
import { RunBackupButton } from "./run-backup";

export const metadata: Metadata = { title: "Backups" };

function formatWhen(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const STATUS_STYLE: Record<string, string> = {
  success: "bg-emerald-50 text-emerald-700",
  failed: "bg-red-50 text-red-700",
  running: "bg-amber-50 text-amber-700",
};

/**
 * Backups panel (MVP.md §9.1).
 *
 * Shows the last few runs and whether the set has gone quiet. The rows are
 * written by the GitHub Actions workflow; this page only reads them.
 *
 * The staleness banner is the point of the page. A backup system that has
 * silently stopped is worse than none, because it is believed.
 */
export default async function BackupsPage() {
  await requireRole("owner");

  const [rows, health] = await Promise.all([
    listRecentBackups(BACKUP_KEEP + 5),
    getBackupHealth(),
  ]);

  const days = daysSinceLastBackup(
    rows.map((row) => ({ status: row.status, createdAt: row.createdAt })),
  );

  return (
    <div className="mx-auto max-w-[1000px] space-y-5">
      <header>
        <h1 className="text-2xl font-bold tracking-[-0.02em]">Backups</h1>
        <p className="mt-1 text-sm text-muted">
          Weekly encrypted database dumps to cPanel over SFTP. The newest{" "}
          {BACKUP_KEEP} are kept; older archives are hard-deleted.
        </p>
      </header>

      {health.stale ? (
        <div
          role="alert"
          className="rounded-[14px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"
        >
          <strong className="font-bold">No recent successful backup.</strong>{" "}
          {days === null
            ? "No run has ever succeeded."
            : `The last success was ${days} ${days === 1 ? "day" : "days"} ago.`}{" "}
          The alert threshold is {BACKUP_STALE_DAYS} days. Check the Actions tab before
          assuming the database is protected.
        </div>
      ) : (
        <div className="rounded-[14px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <strong className="font-bold">Backups are current.</strong>{" "}
          {days === null
            ? ""
            : `Last success ${days === 0 ? "today" : `${days} ${days === 1 ? "day" : "days"} ago`}.`}
        </div>
      )}

      <RunBackupButton />

      <section>
        <h2 className="mb-2 text-sm font-bold">Recent runs</h2>
        {rows.length === 0 ? (
          <p className="rounded-[14px] border border-dashed border-line px-4 py-10 text-center text-sm text-muted">
            No backups recorded yet. Once the workflow runs, its results appear here.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-[14px] border border-line bg-white">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-line text-[11px] uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-2.5 font-bold">Archive</th>
                  <th className="px-4 py-2.5 font-bold">Size</th>
                  <th className="px-4 py-2.5 font-bold">Status</th>
                  <th className="px-4 py-2.5 font-bold">When</th>
                  <th className="px-4 py-2.5 font-bold">Note</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-2.5 font-mono text-xs">{row.filename}</td>
                    <td className="px-4 py-2.5 text-muted">{formatBytes(row.size)}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
                          STATUS_STYLE[row.status] ?? "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-muted">{formatWhen(row.createdAt)}</td>
                    <td className="px-4 py-2.5 text-xs text-muted">
                      {row.message ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-2 text-xs text-muted">
          Rows are written by the GitHub Actions workflow. A run started from here
          shows as <span className="font-semibold">running</span> until the workflow
          reports back.
        </p>
      </section>

      <section className="rounded-[14px] border border-line bg-white p-4">
        <h2 className="text-sm font-bold">Restore guide</h2>
        <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm text-muted">
          <li>
            Download the newest archive from{" "}
            <span className="font-mono text-xs">
              /home/&lt;cpanel_user&gt;/backups/junaed/
            </span>{" "}
            over SFTP.
          </li>
          <li>
            Decrypt it with the private key that matches{" "}
            <span className="font-mono text-xs">BACKUP_AGE_PUBLIC_KEY</span>:{" "}
            <span className="font-mono text-xs">age -d -i key.txt archive.age</span>.
          </li>
          <li>
            Restore into a scratch database first, never straight into production:{" "}
            <span className="font-mono text-xs">
              gunzip -c dump.sql.gz | psql &quot;$SCRATCH_URL&quot;
            </span>
            .
          </li>
          <li>Point a preview deployment at the scratch database and check the site.</li>
          <li>
            Only then restore production. The private key is not stored in this
            repository or in GitHub Secrets.
          </li>
        </ol>
      </section>
    </div>
  );
}
