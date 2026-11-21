import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/rbac";
import { getSettings } from "@/lib/settings";
import {
  getActiveNow,
  getDailySeries,
  getLeadCount,
  getSummary,
  getTopBrowsers,
  getTopCampaigns,
  getTopCountries,
  getTopDevices,
  getTopPages,
  getTopReferrers,
  purgeOldPageViews,
  type BreakdownRow,
} from "@/lib/analytics/repository";
import { conversionRate, isRangeKey, resolveRange, type RangeKey } from "@/lib/analytics/core";

export const metadata: Metadata = { title: "Analytics" };

const RANGES: { key: RangeKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "90d", label: "90 days" },
];

function Breakdown({
  title,
  rows,
  emptyLabel,
  formatLabel,
}: {
  title: string;
  rows: BreakdownRow[];
  emptyLabel: string;
  formatLabel?: (label: string) => string;
}) {
  const max = rows.reduce((m, row) => Math.max(m, row.views), 0);

  return (
    <section className="rounded-[14px] border border-line bg-white p-4">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">
        {title}
      </h2>
      {rows.length === 0 ? (
        <p className="rounded-[10px] border border-dashed border-line px-3 py-6 text-center text-xs text-muted">
          {emptyLabel}
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li key={row.label}>
              <div className="flex items-baseline justify-between gap-2 text-xs">
                <span className="truncate font-semibold">
                  {formatLabel ? formatLabel(row.label) : row.label}
                </span>
                <span className="shrink-0 tabular-nums text-muted">
                  {row.views} · {row.visitors} visitor{row.visitors === 1 ? "" : "s"}
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line">
                <div
                  className="h-full rounded-full bg-violet-500"
                  style={{ width: `${max > 0 ? Math.max(2, (row.views / max) * 100) : 0}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * Visitors & Analytics tab (MVP.md §7.3).
 *
 * First-party numbers only. The page is honest about emptiness: with no traffic
 * yet it says so rather than showing a chart of zeros that looks like a bug.
 *
 * Retention purge runs here on load. This site has no scheduler, and a policy
 * that only exists in a document is not a policy.
 */
export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  await requireRole("support");
  const { range: rangeParam } = await searchParams;
  const rangeKey: RangeKey = isRangeKey(rangeParam ?? "") ? (rangeParam as RangeKey) : "7d";
  const range = resolveRange(rangeKey);

  const settings = await getSettings();

  // Best-effort retention. A failure here must not blank the page.
  try {
    await purgeOldPageViews(settings.analyticsRetentionMonths);
  } catch {
    /* ignore */
  }

  const [
    summary,
    activeNow,
    leads,
    series,
    topPages,
    topReferrers,
    topCountries,
    topDevices,
    topBrowsers,
    topCampaigns,
  ] = await Promise.all([
    getSummary(range),
    getActiveNow(),
    getLeadCount(range),
    getDailySeries(range),
    getTopPages(range, 8),
    getTopReferrers(range, 8),
    getTopCountries(range, 6),
    getTopDevices(range),
    getTopBrowsers(range, 6),
    getTopCampaigns(range, 6),
  ]);

  const rate = conversionRate(leads, summary.uniqueVisitors);
  const hasData = summary.pageViews > 0;
  const maxDay = series.reduce((m, point) => Math.max(m, point.views), 0);

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-[-0.02em]">Analytics</h1>
          <p className="mt-1 text-sm text-muted">
            First-party visitors, {range.label.toLowerCase()}. No raw IP addresses are
            stored.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
            {activeNow} active now
          </span>
          <nav aria-label="Date range" className="flex gap-1">
            {RANGES.map((item) => (
              <Link
                key={item.key}
                href={`/analytics?range=${item.key}`}
                className={
                  item.key === rangeKey
                    ? "rounded-[8px] bg-violet-950 px-2.5 py-1.5 text-xs font-bold text-white"
                    : "rounded-[8px] border border-line px-2.5 py-1.5 text-xs font-bold hover:bg-violet-50"
                }
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {/* ------------------------------ KPIs ------------------------------ */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Unique visitors" value={summary.uniqueVisitors.toLocaleString("en-IN")} />
        <Kpi label="Page views" value={summary.pageViews.toLocaleString("en-IN")} />
        <Kpi label="New leads" value={leads.toLocaleString("en-IN")} />
        <Kpi label="Conversion rate" value={`${rate}%`} />
      </div>

      {/* ----------------------------- chart ------------------------------ */}
      <section className="rounded-[14px] border border-line bg-white p-4">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">
          Views per day
        </h2>
        {!hasData ? (
          <p className="rounded-[10px] border border-dashed border-line px-3 py-10 text-center text-sm text-muted">
            No page views recorded in this range yet. The tracker only runs after a
            visitor accepts cookies.
          </p>
        ) : (
          <div className="flex h-36 items-end gap-[2px]">
            {series.map((point) => (
              <div
                key={point.day}
                className="group relative flex-1 rounded-t bg-violet-200 transition hover:bg-violet-500"
                style={{
                  height: `${maxDay > 0 ? Math.max(2, (point.views / maxDay) * 100) : 0}%`,
                }}
                title={`${point.day}: ${point.views} views, ${point.visitors} visitors`}
              />
            ))}
          </div>
        )}
        {hasData ? (
          <div className="mt-2 flex justify-between text-[11px] text-muted">
            <span>{series[0]?.day}</span>
            <span>{series[series.length - 1]?.day}</span>
          </div>
        ) : null}
      </section>

      {/* --------------------------- breakdowns --------------------------- */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Breakdown
          title="Top pages"
          rows={topPages}
          emptyLabel="No pages viewed yet."
        />
        <Breakdown
          title="Top sources"
          rows={topReferrers}
          emptyLabel="No referrers recorded yet."
        />
        <Breakdown
          title="Countries"
          rows={topCountries}
          emptyLabel="No country data yet. This is filled from the hosting geo header."
        />
        <Breakdown
          title="Devices"
          rows={topDevices}
          emptyLabel="No device data yet."
        />
        <Breakdown
          title="Browsers"
          rows={topBrowsers}
          emptyLabel="No browser data yet."
        />
        <Breakdown
          title="Campaigns"
          rows={topCampaigns}
          emptyLabel="No UTM-tagged visits yet."
        />
      </div>

      <p className="text-xs leading-[1.7] text-muted">
        Retention is {settings.analyticsRetentionMonths} months and is enforced when this
        page loads. Change it in{" "}
        <Link href="/settings" className="font-semibold text-violet-700 hover:underline">
          Settings
        </Link>
        .
      </p>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[14px] border border-line bg-white p-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-muted">
        {label}
      </p>
      <p className="mt-1.5 font-display text-2xl font-extrabold tracking-[-0.03em]">
        {value}
      </p>
    </div>
  );
}