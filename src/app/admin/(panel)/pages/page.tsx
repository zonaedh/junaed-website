import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/rbac";
import { getAdminBase } from "@/lib/admin-path";
import { PAGE_DEFINITIONS, listPagesForAdmin } from "@/lib/pages";

export const metadata: Metadata = { title: "Pages" };

/**
 * Pages list (MVP.md §3.3).
 *
 * Shows every declared page, whether or not a row exists yet. A page with no
 * row renders its defaults on the public site, so "Not saved" is an honest
 * state rather than a missing one.
 */
export default async function PagesPage() {
  await requireRole("editor");
  const base = await getAdminBase();
  const rows = await listPagesForAdmin();
  const byKey = new Map(rows.map((row) => [row.key, row]));

  return (
    <div className="mx-auto max-w-[900px]">
      <div className="mb-5">
        <h1 className="font-display text-[26px] font-extrabold tracking-[-0.04em]">
          Pages
        </h1>
        <p className="mt-1 text-sm text-muted">
          Editable page content, one form per page. Published changes appear on
          the public site immediately.
        </p>
      </div>

      <ul className="grid gap-3">
        {PAGE_DEFINITIONS.map((definition) => {
          const row = byKey.get(definition.key);
          const status = row?.status ?? "draft";
          const saved = row?.updatedAt != null;

          return (
            <li
              key={definition.key}
              className="flex flex-col gap-3 rounded-[18px] border border-line bg-white p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-base font-extrabold tracking-[-0.03em]">
                    {definition.name}
                  </h2>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                      status === "published"
                        ? "bg-emerald-50 text-emerald-800"
                        : "bg-amber-50 text-amber-800"
                    }`}
                  >
                    {status === "published" ? "Published" : "Draft"}
                  </span>
                  {!saved ? (
                    <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-[11px] font-bold text-violet-800">
                      Not saved yet
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm leading-[1.6] text-muted">
                  {definition.description}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {definition.path}
                  {row?.updatedAt
                    ? ` · updated ${row.updatedAt.toLocaleString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        timeZone: "UTC",
                      })} UTC`
                    : ""}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <Link
                  href={`${base}/pages/${definition.key}`}
                  className="inline-flex min-h-10 items-center rounded-lg border border-line px-4 text-sm font-bold text-violet-800 transition hover:bg-violet-50"
                >
                  Edit
                </Link>
                <a
                  href={definition.path}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-10 items-center rounded-lg px-3 text-sm font-bold text-muted transition hover:text-violet-700"
                >
                  View
                </a>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
