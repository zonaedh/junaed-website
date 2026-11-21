import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/rbac";
import {
  listActionNames,
  listActors,
  listActivity,
  oldestEntry,
} from "@/lib/security/activity-log";
import { ClearLogsPanel } from "./clear-logs";

export const metadata: Metadata = { title: "Activity" };

function formatWhen(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Colour by action family, so a scan finds the security events first. */
function actionTone(action: string): string {
  if (action.startsWith("auth.login.failed") || action.startsWith("auth.login.locked")) {
    return "bg-red-50 text-red-700";
  }
  if (action.startsWith("security.")) return "bg-amber-50 text-amber-700";
  if (action.startsWith("auth.")) return "bg-violet-50 text-violet-700";
  if (action.endsWith(".deleted") || action.endsWith(".cleared")) {
    return "bg-slate-100 text-slate-700";
  }
  return "bg-emerald-50 text-emerald-700";
}

/**
 * Activity log (MVP.md §8.3).
 *
 * Every admin mutation writes here through lib/audit.ts. This page is the read
 * side: filter by actor, action and date, paginated so it stays fast as the log
 * grows.
 *
 * The clear panel is rendered only for the owner — and the action re-checks the
 * role server-side, because hiding a button is not access control.
 */
export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const actor = await requireRole("admin");
  const params = await searchParams;

  const first = (key: string): string => {
    const value = params[key];
    if (Array.isArray(value)) return value[0] ?? "";
    return value ?? "";
  };

  const userFilter = first("user");
  const actionFilter = first("action");
  const fromFilter = first("from");
  const toFilter = first("to");
  const page = Math.max(1, Number(first("page") || "1") || 1);

  const [result, actions, actors, oldest] = await Promise.all([
    listActivity({
      userId: userFilter ? Number(userFilter) : null,
      action: actionFilter || null,
      from: fromFilter ? new Date(`${fromFilter}T00:00:00Z`) : null,
      // Exclusive upper bound: "to" means the end of that day.
      to: toFilter ? new Date(`${toFilter}T23:59:59.999Z`) : null,
      page,
    }),
    listActionNames(),
    listActors(),
    oldestEntry(),
  ]);

  const query = (overrides: Record<string, string>): string => {
    const next = new URLSearchParams();
    if (userFilter) next.set("user", userFilter);
    if (actionFilter) next.set("action", actionFilter);
    if (fromFilter) next.set("from", fromFilter);
    if (toFilter) next.set("to", toFilter);
    for (const [key, value] of Object.entries(overrides)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    const text = next.toString();
    return text ? `/admin/activity?${text}` : "/admin/activity";
  };

  return (
    <div className="mx-auto max-w-[1100px] space-y-5">
      <header>
        <h1 className="text-2xl font-bold tracking-[-0.02em]">Activity</h1>
        <p className="mt-1 text-sm text-muted">
          {result.total} {result.total === 1 ? "entry" : "entries"}
          {oldest ? ` · oldest retained ${formatWhen(oldest)}` : ""}
        </p>
      </header>

      <form method="get" className="rounded-[14px] border border-line bg-white p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor="user" className="mb-1 block text-xs font-bold">
              User
            </label>
            <select
              id="user"
              name="user"
              defaultValue={userFilter}
              className="w-full rounded-[10px] border border-line bg-white px-3 py-2 text-sm outline-none focus:border-violet-400"
            >
              <option value="">Anyone</option>
              {actors.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="action" className="mb-1 block text-xs font-bold">
              Action
            </label>
            <select
              id="action"
              name="action"
              defaultValue={actionFilter}
              className="w-full rounded-[10px] border border-line bg-white px-3 py-2 text-sm outline-none focus:border-violet-400"
            >
              <option value="">Any action</option>
              {actions.map((entry) => (
                <option key={entry} value={entry}>
                  {entry}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="from" className="mb-1 block text-xs font-bold">
              From
            </label>
            <input
              id="from"
              name="from"
              type="date"
              defaultValue={fromFilter}
              className="w-full rounded-[10px] border border-line bg-white px-3 py-2 text-sm outline-none focus:border-violet-400"
            />
          </div>

          <div>
            <label htmlFor="to" className="mb-1 block text-xs font-bold">
              To
            </label>
            <input
              id="to"
              name="to"
              type="date"
              defaultValue={toFilter}
              className="w-full rounded-[10px] border border-line bg-white px-3 py-2 text-sm outline-none focus:border-violet-400"
            />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="submit"
            className="inline-flex items-center rounded-[10px] bg-violet-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-800"
          >
            Apply filters
          </button>
          <Link
            href="/admin/activity"
            className="inline-flex items-center rounded-[10px] border border-line px-4 py-2 text-sm font-semibold transition hover:bg-violet-50"
          >
            Reset
          </Link>
        </div>
      </form>

      {result.rows.length === 0 ? (
        <p className="rounded-[14px] border border-dashed border-line px-4 py-12 text-center text-sm text-muted">
          No entries match those filters.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-[14px] border border-line bg-white">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-line text-[11px] uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-2.5 font-bold">When</th>
                <th className="px-4 py-2.5 font-bold">Who</th>
                <th className="px-4 py-2.5 font-bold">Action</th>
                <th className="px-4 py-2.5 font-bold">Entity</th>
                <th className="px-4 py-2.5 font-bold">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {result.rows.map((row) => (
                <tr key={row.id} className="align-top">
                  <td className="whitespace-nowrap px-4 py-2.5 text-[12px] text-muted">
                    {formatWhen(row.createdAt)}
                  </td>
                  <td className="px-4 py-2.5 text-[12px]">
                    {row.userName ?? <span className="text-muted">System</span>}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${actionTone(row.action)}`}
                    >
                      {row.action}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-[12px] text-muted">
                    {row.entity ?? "—"}
                    {row.entityId ? ` #${row.entityId}` : ""}
                  </td>
                  <td className="px-4 py-2.5 text-[12px] text-muted">
                    {row.meta ? (
                      <code className="break-all font-mono text-[11px]">
                        {JSON.stringify(row.meta)}
                      </code>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {result.pageCount > 1 ? (
        <nav className="flex items-center justify-between text-sm" aria-label="Pagination">
          <span className="text-muted">
            Page {result.page} of {result.pageCount}
          </span>
          <div className="flex gap-2">
            {result.page > 1 ? (
              <Link
                href={query({ page: String(result.page - 1) })}
                className="rounded-[10px] border border-line px-3 py-1.5 font-semibold transition hover:bg-violet-50"
              >
                Previous
              </Link>
            ) : null}
            {result.page < result.pageCount ? (
              <Link
                href={query({ page: String(result.page + 1) })}
                className="rounded-[10px] border border-line px-3 py-1.5 font-semibold transition hover:bg-violet-50"
              >
                Next
              </Link>
            ) : null}
          </div>
        </nav>
      ) : null}

      {actor.role === "owner" ? <ClearLogsPanel /> : null}
    </div>
  );
}
