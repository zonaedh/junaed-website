import type { Metadata } from "next";
import Link from "next/link";
import { requireRole, ROLE_LABELS } from "@/lib/rbac";
import {
  getActiveNow,
  getDailySeries,
  getLeadCount,
  getSummary,
  getTopPages,
  getTopReferrers,
  listAlerts,
  countUnreadAlerts,
  raiseAlertOncePerDay,
} from "@/lib/analytics/repository";
import {
  conversionRate,
  percentChange,
  resolveRange,
} from "@/lib/analytics/core";
import { listLeads } from "@/lib/leads/repository";
import { listPostsForAdmin } from "@/lib/posts/repository";
import { listPortfolioForAdmin } from "@/lib/portfolio/repository";

export const metadata: Metadata = { title: "Dashboard" };

function formatWhen(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Dashboard (MVP.md §7.4).
 *
 * Real numbers only. Where there is no data yet the card says so rather than
 * showing a zero that looks like a bug — the same rule the Phase 2 shell
 * followed, now with actual figures behind it.
 *
 * The 7-day window is compared against the previous 7 days so the trend arrow
 * means something. A comparison against zero returns null and renders as
 * "no comparison", because "+100%" from nothing is a lie.
 */
export default async function DashboardPage() {
  const user = await requireRole("support");

  const current = resolveRange("7d");
  const previousFrom = new Date(current.from);
  previousFrom.setDate(previousFrom.getDate() - 7);
  const previous = { ...current, from: previousFrom, to: current.from };

  const [
    summary,
    prevSummary,
    leadsNow,
    prevLeads,
    activeNow,
    series,
    topPages,
    topReferrers,
    recentLeads,
    posts,
    portfolio,
    alerts,
    unreadAlerts,
  ] = await Promise.all([
    getSummary(current),
    getSummary(previous),
    getLeadCount(current),
    getLeadCount(previous),
    getActiveNow(),
    getDailySeries(resolveRange("30d")),
    getTopPages(current, 5),
    getTopReferrers(current, 5),
    listLeads({ perPage: 5 }),
    listPostsForAdmin(),
    listPortfolioForAdmin(),
    listAlerts(5),
    countUnreadAlerts(),
  ]);

  // A new lead is worth telling the owner about, once per day.
  if (leadsNow > 0) {
    await raiseAlertOncePerDay({
      type: "lead.new",
      severity: "info",
      message: `${leadsNow} new enquir${leadsNow === 1 ? "y" : "ies"} in the last 7 days.`,
    }).catch(() => false);
  }

  const visitorTrend = percentChange(summary.uniqueVisitors, prevSummary.uniqueVisitors);
  const viewTrend = percentChange(summary.pageViews, prevSummary.pageViews);
  const leadTrend = percentChange(leadsNow, prevLeads);
  const rate = conversionRate(leadsNow, summary.uniqueVisitors);
  const maxDay = series.reduce((max, point) => Math.max(max, point.views), 0);

  const drafts = posts.filter((post) => post.status === "draft").length;
  const publishedPosts = posts.filter((post) => post.status === "published").length;

  return (
    <div className="mx-auto max-w-[1180px] space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-[26px] font-extrabold tracking-[-0.04em]">
            Welcome back, {user.name.split(" ")[0]}
          </h1>
          <p className="mt-1 text-sm text-muted">
            Signed in as {ROLE_LABELS[user.role]} · {activeNow} visitor
            {activeNow === 1 ? "" : "s"} active now
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/posts/new"
            className="inline-flex min-h-10 items-center rounded-[10px] bg-violet-950 px-4 text-sm font-semibold text-white hover:bg-violet-800"
          >
            New post
          </Link>
          <Link
            href="/portfolio/new"
            className="inline-flex min-h-10 items-center rounded-[10px] border border-line px-4 text-sm font-semibold hover:bg-violet-50"
          >
            New project
          </Link>
          <Link
            href="/media"
            className="inline-flex min-h-10 items-center rounded-[10px] border border-line px-4 text-sm font-semibold hover:bg-violet-50"
          >
            Upload media
          </Link>
        </div>
      </header>

      {/* ------------------------------ KPIs ------------------------------ */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          label="Visitors (7d)"
          value={summary.uniqueVisitors.toLocaleString("en-IN")}
          trend={visitorTrend}
        />
        <Kpi
          label="Page views (7d)"
          value={summary.pageViews.toLocaleString("en-IN")}
          trend={viewTrend}
        />
        <Kpi
          label="New leads (7d)"
          value={leadsNow.toLocaleString("en-IN")}
          trend={leadTrend}
        />
        <Kpi label="Conversion rate" value={`${rate}%`} />
      </div>

      {/* ----------------------------- chart ------------------------------ */}
      <section className="rounded-[16px] border border-line bg-white p-4 sm:p-5">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-display text-lg font-extrabold tracking-[-0.03em]">
            Visitors, last 30 days
          </h2>
          <Link href="/analytics" className="text-xs font-bold text-violet-700 hover:underline">
            Full analytics →
          </Link>
        </div>
        {maxDay === 0 ? (
          <p className="rounded-[10px] border border-dashed border-line px-3 py-10 text-center text-sm text-muted">
            No traffic recorded yet. The tracker only runs after a visitor accepts
            cookies.
          </p>
        ) : (
          <>
            <div className="flex h-40 items-end gap-[2px]">
              {series.map((point) => (
                <div
                  key={point.day}
                  className="flex-1 rounded-t bg-violet-200 transition hover:bg-violet-500"
                  style={{
                    height: `${Math.max(2, (point.views / maxDay) * 100)}%`,
                  }}
                  title={`${point.day}: ${point.views} views, ${point.visitors} visitors`}
                />
              ))}
            </div>
            <div className="mt-2 flex justify-between text-[11px] text-muted">
              <span>{series[0]?.day}</span>
              <span>{series[series.length - 1]?.day}</span>
            </div>
          </>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* --------------------------- latest leads --------------------------- */}
        <section className="rounded-[16px] border border-line bg-white p-4 sm:p-5">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted">
              Latest enquiries
            </h2>
            <Link href="/leads" className="text-xs font-bold text-violet-700 hover:underline">
              All leads →
            </Link>
          </div>
          {recentLeads.rows.length === 0 ? (
            <p className="rounded-[10px] border border-dashed border-line px-3 py-8 text-center text-xs text-muted">
              No enquiries yet.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {recentLeads.rows.map((lead) => (
                <li key={lead.id} className="py-2.5">
                  <Link
                    href={`/leads/${lead.id}`}
                    className="flex items-baseline justify-between gap-2"
                  >
                    <span className="truncate text-sm font-semibold">{lead.name}</span>
                    <span className="shrink-0 text-[11px] text-muted">
                      {formatWhen(lead.createdAt)}
                    </span>
                  </Link>
                  <p className="truncate text-[11px] text-muted">{lead.email}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ---------------------------- top pages ---------------------------- */}
        <section className="rounded-[16px] border border-line bg-white p-4 sm:p-5">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">
            Top pages (7d)
          </h2>
          {topPages.length === 0 ? (
            <p className="rounded-[10px] border border-dashed border-line px-3 py-8 text-center text-xs text-muted">
              No page views yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {topPages.map((row) => (
                <li key={row.label} className="flex items-baseline justify-between gap-2 text-xs">
                  <span className="truncate font-semibold">{row.label}</span>
                  <span className="shrink-0 tabular-nums text-muted">{row.views}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ---------------------------- top sources -------------------------- */}
        <section className="rounded-[16px] border border-line bg-white p-4 sm:p-5">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">
            Top sources (7d)
          </h2>
          {topReferrers.length === 0 ? (
            <p className="rounded-[10px] border border-dashed border-line px-3 py-8 text-center text-xs text-muted">
              No referrers yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {topReferrers.map((row) => (
                <li key={row.label} className="flex items-baseline justify-between gap-2 text-xs">
                  <span className="truncate font-semibold">{row.label}</span>
                  <span className="shrink-0 tabular-nums text-muted">{row.views}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* ----------------------------- content ----------------------------- */}
        <section className="rounded-[16px] border border-line bg-white p-4 sm:p-5">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">
            Content
          </h2>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-[11px] font-bold uppercase tracking-wide text-muted">
                Published posts
              </dt>
              <dd className="mt-0.5 font-display text-xl font-extrabold">{publishedPosts}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-bold uppercase tracking-wide text-muted">
                Drafts
              </dt>
              <dd className="mt-0.5 font-display text-xl font-extrabold">{drafts}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-bold uppercase tracking-wide text-muted">
                Portfolio items
              </dt>
              <dd className="mt-0.5 font-display text-xl font-extrabold">
                {portfolio.length}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-bold uppercase tracking-wide text-muted">
                Unread alerts
              </dt>
              <dd className="mt-0.5 font-display text-xl font-extrabold">{unreadAlerts}</dd>
            </div>
          </dl>
        </section>
      </div>

      {/* ------------------------------ alerts ----------------------------- */}
      <section className="rounded-[16px] border border-line bg-white p-4 sm:p-5">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted">
            Recent alerts
          </h2>
          <Link href="/alerts" className="text-xs font-bold text-violet-700 hover:underline">
            All alerts →
          </Link>
        </div>
        {alerts.length === 0 ? (
          <p className="rounded-[10px] border border-dashed border-line px-3 py-8 text-center text-xs text-muted">
            Nothing to report. Alerts appear here when something needs attention.
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {alerts.map((alert) => (
              <li key={alert.id} className="flex items-start gap-3 py-2.5">
                <span
                  aria-hidden="true"
                  className={`mt-1 size-2 shrink-0 rounded-full ${
                    alert.severity === "critical"
                      ? "bg-red-500"
                      : alert.severity === "warning"
                        ? "bg-amber-500"
                        : "bg-violet-400"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <p className={`text-sm ${alert.isRead ? "text-muted" : "font-semibold"}`}>
                    {alert.message}
                  </p>
                  <p className="text-[11px] text-muted">{formatWhen(alert.createdAt)}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Kpi({
  label,
  value,
  trend,
}: {
  label: string;
  value: string;
  trend?: number | null;
}) {
  return (
    <div className="rounded-[16px] border border-line bg-white p-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted">{label}</p>
      <p className="mt-1.5 font-display text-2xl font-extrabold tracking-[-0.03em]">{value}</p>
      {trend === undefined ? null : trend === null ? (
        <p className="mt-0.5 text-[11px] text-muted">no comparison</p>
      ) : (
        <p
          className={`mt-0.5 text-[11px] font-semibold ${
            trend > 0 ? "text-emerald-700" : trend < 0 ? "text-red-700" : "text-muted"
          }`}
        >
          {trend > 0 ? "▲" : trend < 0 ? "▼" : "—"} {Math.abs(trend)}% vs previous 7 days
        </p>
      )}
    </div>
  );
}