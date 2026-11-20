import type { Metadata } from "next";
import Link from "next/link";
import { getAdminBase } from "@/lib/admin-path";
import { requireRole } from "@/lib/rbac";
import { listPortfolioForAdmin } from "@/lib/portfolio/repository";

export const metadata: Metadata = { title: "Portfolio" };

const STATUS_STYLE: Record<string, string> = {
  published: "bg-emerald-50 text-emerald-800",
  draft: "bg-amber-50 text-amber-900",
  scheduled: "bg-violet-50 text-violet-800",
  archived: "bg-surface text-muted",
};

export default async function PortfolioAdminPage() {
  await requireRole("editor");
  const base = await getAdminBase();
  const items = await listPortfolioForAdmin();

  return (
    <div className="mx-auto max-w-[1000px]">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[clamp(1.5rem,3vw,2rem)] tracking-[-0.04em]">
            Portfolio
          </h1>
          <p className="mt-1 text-sm text-muted">
            {items.length} project{items.length === 1 ? "" : "s"} ·{" "}
            {items.filter((item) => item.isFeatured).length} featured
          </p>
        </div>
        <Link
          href={`${base}/portfolio/new`}
          className="inline-flex min-h-10 items-center rounded-[10px] bg-violet-950 px-4 text-sm font-bold text-white hover:bg-violet-700"
        >
          New project
        </Link>
      </header>

      {items.length === 0 ? (
        <div className="rounded-[16px] border border-dashed border-line px-5 py-14 text-center">
          <p className="text-sm font-bold">No projects yet.</p>
          <p className="mx-auto mt-1 max-w-[420px] text-sm leading-[1.6] text-muted">
            Add a case study with a cover image, the problem, the approach and
            what changed. Featured projects appear on the home page.
          </p>
          <Link
            href={`${base}/portfolio/new`}
            className="mt-4 inline-flex min-h-10 items-center rounded-[10px] bg-violet-950 px-4 text-sm font-bold text-white"
          >
            Add a project
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-[16px] border border-line bg-white">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={`${base}/portfolio/${item.id}`}
                className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3.5 transition-colors hover:bg-violet-50/40"
              >
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-sm font-bold">
                      {item.title}
                    </span>
                    {item.isFeatured ? (
                      <span className="rounded-full bg-violet-950 px-2 py-0.5 text-[10px] font-bold text-white">
                        Featured
                      </span>
                    ) : null}
                  </span>
                  <span className="block truncate text-xs text-muted">
                    /portfolio/{item.slug}
                    {item.year ? ` · ${item.year}` : ""}
                  </span>
                </span>

                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold capitalize ${
                    STATUS_STYLE[item.status] ?? "bg-surface text-muted"
                  }`}
                >
                  {item.status}
                </span>

                <span className="w-[60px] text-right text-xs text-muted">
                  #{item.sortOrder}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-4 text-xs leading-[1.6] text-muted">
        Order is set by the sort number on each project. Lower appears first.
      </p>
    </div>
  );
}
