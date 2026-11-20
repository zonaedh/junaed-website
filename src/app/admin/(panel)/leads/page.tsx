import type { Metadata } from "next";
import Link from "next/link";
import { getAdminBase } from "@/lib/admin-path";
import { requireRole } from "@/lib/rbac";
import { listLeads } from "@/lib/leads/repository";
import type { LeadStatus } from "@/lib/leads/repository";

export const metadata: Metadata = { title: "Leads" };

const STATUS_STYLE: Record<string, string> = {
  new: "bg-violet-50 text-violet-800",
  read: "bg-sky-50 text-sky-800",
  replied: "bg-emerald-50 text-emerald-800",
  archived: "bg-surface text-muted",
  spam: "bg-red-50 text-red-800",
};

const FILTERS: Array<{ value: LeadStatus | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "new", label: "New" },
  { value: "read", label: "Read" },
  { value: "replied", label: "Replied" },
  { value: "archived", label: "Archived" },
  { value: "spam", label: "Spam" },
];

function formatWhen(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/**
 * Leads list (MVP.md §5.2).
 *
 * Reads uncached: a lead that just arrived must appear on reload, and the
 * unread badge depends on it.
 */
export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>;
}) {
  await requireRole("support");
  const base = await getAdminBase();
  const params = await searchParams;

  const status = (params.status ?? "all") as LeadStatus | "all";
  const search = params.q ?? "";
  const page = Number(params.page ?? "1") || 1;

  const result = await listLeads({ status, search, page });

  const queryFor = (overrides: Record<string, string | number>) => {
    const next = new URLSearchParams();
    const merged = { status, q: search, page: 1, ...overrides };
    if (merged.status && merged.status !== "all") next.set("status", String(merged.status));
    if (merged.q) next.set("q", String(merged.q));
    if (Number(merged.page) > 1) next.set("page", String(merged.page));
    const query = next.toString();
    return query ? `?${query}` : "";
  };

  return (
    <div className="mx-auto max-w-[1100px]">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[clamp(1.5rem,3vw,2rem)] tracking-[-0.04em]">
            Leads
          </h1>
          <p className="mt-1 text-sm text-muted">
            {result.total} {result.total === 1 ? "enquiry" : "enquiries"}
            {status !== "all" ? ` · ${status}` : ""}
            {search ? ` · matching “${search}”` : ""}
          </p>
        </div>
        <a
          href={`${base}/leads/export`}
          className="rounded-[11px] border border-line bg-white px-4 py-2.5 text-sm font-semibold transition hover:border-violet-200 hover:text-violet-700"
        >
          Export CSV
        </a>
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {FILTERS.map((filter) => {
          const active = status === filter.value;
          return (
            <Link
              key={filter.value}
              href={`${base}/leads${queryFor({ status: filter.value })}`}
              className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ${
                active
                  ? "border-violet-950 bg-violet-950 text-white"
                  : "border-line bg-white text-muted hover:border-violet-200 hover:text-violet-700"
              }`}
            >
              {filter.label}
            </Link>
          );
        })}
      </div>

      <form
        method="get"
        action={`${base}/leads`}
        className="mb-4 flex flex-wrap gap-2"
      >
        {status !== "all" ? (
          <input type="hidden" name="status" value={status} />
        ) : null}
        <input
          name="q"
          defaultValue={search}
          placeholder="Search name, email or message"
          className="min-w-[220px] flex-1 rounded-[11px] border border-line bg-white px-4 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-[3px] focus:ring-violet-100"
        />
        <button
          type="submit"
          className="rounded-[11px] border border-line bg-white px-4 py-2.5 text-sm font-semibold transition hover:border-violet-200 hover:text-violet-700"
        >
          Search
        </button>
        {search ? (
          <Link
            href={`${base}/leads${queryFor({ q: "" })}`}
            className="rounded-[11px] px-3 py-2.5 text-sm font-semibold text-muted hover:text-violet-700"
          >
            Clear
          </Link>
        ) : null}
      </form>

      {result.rows.length === 0 ? (
        <div className="rounded-[16px] border border-line bg-white p-10 text-center">
          <p className="text-sm text-muted">
            No enquiries yet. Submissions from the contact form appear here.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[16px] border border-line bg-white">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-line bg-surface text-left">
                <th className="px-4 py-3 font-semibold">Received</th>
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Service</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {result.rows.map((lead) => (
                <tr
                  key={lead.id}
                  className="border-b border-line/60 last:border-0 hover:bg-surface/60"
                >
                  <td className="whitespace-nowrap px-4 py-3 text-muted">
                    {formatWhen(lead.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`${base}/leads/${lead.id}`}
                      className="font-semibold hover:text-violet-700"
                    >
                      {lead.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted">{lead.email}</td>
                  <td className="px-4 py-3 text-muted">
                    {lead.service ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${
                        STATUS_STYLE[lead.status] ?? "bg-surface text-muted"
                      }`}
                    >
                      {lead.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {result.totalPages > 1 ? (
        <nav className="mt-4 flex items-center justify-between text-sm">
          <span className="text-muted">
            Page {result.page} of {result.totalPages}
          </span>
          <div className="flex gap-2">
            {result.page > 1 ? (
              <Link
                href={`${base}/leads${queryFor({ page: result.page - 1 })}`}
                className="rounded-[10px] border border-line bg-white px-3 py-1.5 font-semibold hover:border-violet-200"
              >
                Previous
              </Link>
            ) : null}
            {result.page < result.totalPages ? (
              <Link
                href={`${base}/leads${queryFor({ page: result.page + 1 })}`}
                className="rounded-[10px] border border-line bg-white px-3 py-1.5 font-semibold hover:border-violet-200"
              >
                Next
              </Link>
            ) : null}
          </div>
        </nav>
      ) : null}
    </div>
  );
}
