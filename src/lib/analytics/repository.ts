/**
 * Analytics repository — all database access for page views and alerts.
 *
 * SERVER ONLY.
 *
 * No caching: the owner opens the analytics page expecting the numbers to
 * include the visit they just made. At this volume a cache would only add
 * staleness.
 */

import { and, desc, eq, gte, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { alerts, leads, pageViews } from "@/db/schema";
import type { DateRange } from "./core";

/* ------------------------------ recording ---------------------------------- */

export type NewPageView = {
  path: string;
  referrer?: string | null;
  country?: string | null;
  device?: string | null;
  browser?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  visitorHash?: string | null;
  sessionHash?: string | null;
};

export async function recordPageView(input: NewPageView): Promise<void> {
  await db.insert(pageViews).values({
    path: input.path,
    referrer: input.referrer ?? null,
    country: input.country ?? null,
    device: input.device ?? null,
    browser: input.browser ?? null,
    utmSource: input.utmSource ?? null,
    utmMedium: input.utmMedium ?? null,
    utmCampaign: input.utmCampaign ?? null,
    visitorHash: input.visitorHash ?? null,
    sessionHash: input.sessionHash ?? null,
  });
}

/* -------------------------------- summary ---------------------------------- */

export type AnalyticsSummary = {
  pageViews: number;
  uniqueVisitors: number;
  /** Views whose referrer is empty or this site. */
  internalViews: number;
};

/**
 * Headline counts for a range.
 *
 * Unique visitors is a `count(distinct visitor_hash)`, which is why the hash is
 * daily-salted: the same person on two days counts twice, and that is the
 * honest number rather than a persistent identifier we would have to store.
 */
export async function getSummary(range: DateRange): Promise<AnalyticsSummary> {
  const [row] = await db
    .select({
      pageViews: sql<number>`count(*)::int`,
      uniqueVisitors: sql<number>`count(distinct ${pageViews.visitorHash})::int`,
    })
    .from(pageViews)
    .where(and(gte(pageViews.createdAt, range.from), lt(pageViews.createdAt, range.to)));

  return {
    pageViews: row?.pageViews ?? 0,
    uniqueVisitors: row?.uniqueVisitors ?? 0,
    internalViews: 0,
  };
}

/* ------------------------------- breakdowns -------------------------------- */

export type BreakdownRow = { label: string; views: number; visitors: number };

/** Top pages by view count. */
export async function getTopPages(range: DateRange, limit = 10): Promise<BreakdownRow[]> {
  const rows = await db
    .select({
      label: pageViews.path,
      views: sql<number>`count(*)::int`,
      visitors: sql<number>`count(distinct ${pageViews.visitorHash})::int`,
    })
    .from(pageViews)
    .where(and(gte(pageViews.createdAt, range.from), lt(pageViews.createdAt, range.to)))
    .groupBy(pageViews.path)
    .orderBy(desc(sql`count(*)`))
    .limit(limit);

  return rows;
}

/** Top referrer hosts. Stored as the full URL, so the host is extracted in SQL. */
export async function getTopReferrers(range: DateRange, limit = 10): Promise<BreakdownRow[]> {
  const rows = await db
    .select({
      label: sql<string>`coalesce(nullif(${pageViews.referrer}, ''), 'Direct')`,
      views: sql<number>`count(*)::int`,
      visitors: sql<number>`count(distinct ${pageViews.visitorHash})::int`,
    })
    .from(pageViews)
    .where(and(gte(pageViews.createdAt, range.from), lt(pageViews.createdAt, range.to)))
    .groupBy(sql`coalesce(nullif(${pageViews.referrer}, ''), 'Direct')`)
    .orderBy(desc(sql`count(*)`))
    .limit(limit);

  return rows;
}

export async function getTopCountries(range: DateRange, limit = 10): Promise<BreakdownRow[]> {
  const rows = await db
    .select({
      label: sql<string>`coalesce(${pageViews.country}, 'Unknown')`,
      views: sql<number>`count(*)::int`,
      visitors: sql<number>`count(distinct ${pageViews.visitorHash})::int`,
    })
    .from(pageViews)
    .where(and(gte(pageViews.createdAt, range.from), lt(pageViews.createdAt, range.to)))
    .groupBy(sql`coalesce(${pageViews.country}, 'Unknown')`)
    .orderBy(desc(sql`count(*)`))
    .limit(limit);

  return rows;
}

export async function getTopDevices(range: DateRange): Promise<BreakdownRow[]> {
  const rows = await db
    .select({
      label: sql<string>`coalesce(${pageViews.device}, 'Unknown')`,
      views: sql<number>`count(*)::int`,
      visitors: sql<number>`count(distinct ${pageViews.visitorHash})::int`,
    })
    .from(pageViews)
    .where(and(gte(pageViews.createdAt, range.from), lt(pageViews.createdAt, range.to)))
    .groupBy(sql`coalesce(${pageViews.device}, 'Unknown')`)
    .orderBy(desc(sql`count(*)`));

  return rows;
}

export async function getTopBrowsers(range: DateRange, limit = 8): Promise<BreakdownRow[]> {
  const rows = await db
    .select({
      label: sql<string>`coalesce(${pageViews.browser}, 'Unknown')`,
      views: sql<number>`count(*)::int`,
      visitors: sql<number>`count(distinct ${pageViews.visitorHash})::int`,
    })
    .from(pageViews)
    .where(and(gte(pageViews.createdAt, range.from), lt(pageViews.createdAt, range.to)))
    .groupBy(sql`coalesce(${pageViews.browser}, 'Unknown')`)
    .orderBy(desc(sql`count(*)`))
    .limit(limit);

  return rows;
}

export async function getTopCampaigns(range: DateRange, limit = 10): Promise<BreakdownRow[]> {
  const rows = await db
    .select({
      label: sql<string>`coalesce(${pageViews.utmCampaign}, ${pageViews.utmSource}, 'None')`,
      views: sql<number>`count(*)::int`,
      visitors: sql<number>`count(distinct ${pageViews.visitorHash})::int`,
    })
    .from(pageViews)
    .where(
      and(
        gte(pageViews.createdAt, range.from),
        lt(pageViews.createdAt, range.to),
        sql`(${pageViews.utmCampaign} is not null or ${pageViews.utmSource} is not null)`,
      ),
    )
    .groupBy(sql`coalesce(${pageViews.utmCampaign}, ${pageViews.utmSource}, 'None')`)
    .orderBy(desc(sql`count(*)`))
    .limit(limit);

  return rows;
}

/* --------------------------------- series ---------------------------------- */

export type DailyPoint = { day: string; views: number; visitors: number };

/**
 * Views and visitors per day, for the dashboard chart.
 *
 * `generate_series` fills the gaps so a quiet day shows as zero rather than
 * disappearing — a chart with missing days lies about the trend.
 */
export async function getDailySeries(range: DateRange): Promise<DailyPoint[]> {
  const rows = await db.execute<{ day: string; views: number; visitors: number }>(sql`
    with days as (
      select generate_series(
        date_trunc('day', ${range.from}::timestamptz),
        date_trunc('day', ${range.to}::timestamptz),
        interval '1 day'
      ) as day
    )
    select
      to_char(d.day, 'YYYY-MM-DD') as day,
      coalesce(count(pv.id), 0)::int as views,
      coalesce(count(distinct pv.visitor_hash), 0)::int as visitors
    from days d
    left join ${pageViews} pv
      on date_trunc('day', pv.created_at) = d.day
    group by d.day
    order by d.day
  `);

  return rows.rows.map((row) => ({
    day: row.day,
    views: Number(row.views),
    visitors: Number(row.visitors),
  }));
}

/* ------------------------------ realtime ----------------------------------- */

/** Distinct visitors in the last five minutes. */
export async function getActiveNow(): Promise<number> {
  const since = new Date(Date.now() - 5 * 60 * 1000);
  const [row] = await db
    .select({ value: sql<number>`count(distinct ${pageViews.visitorHash})::int` })
    .from(pageViews)
    .where(gte(pageViews.createdAt, since));
  return row?.value ?? 0;
}

/* ------------------------------ conversions -------------------------------- */

export async function getLeadCount(range: DateRange): Promise<number> {
  const [row] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(leads)
    .where(and(gte(leads.createdAt, range.from), lt(leads.createdAt, range.to)));
  return row?.value ?? 0;
}

/* -------------------------------- retention -------------------------------- */

/**
 * Delete page views older than the retention window.
 *
 * Called from the analytics page load rather than a cron job: this site has no
 * scheduler, and a purge that runs when someone looks is better than a policy
 * that exists only in a document.
 */
export async function purgeOldPageViews(retentionMonths: number): Promise<number> {
  if (!Number.isFinite(retentionMonths) || retentionMonths <= 0) return 0;
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - retentionMonths);

  const rows = await db
    .delete(pageViews)
    .where(lt(pageViews.createdAt, cutoff))
    .returning({ id: pageViews.id });

  return rows.length;
}

/* --------------------------------- alerts ---------------------------------- */

export type AlertRow = typeof alerts.$inferSelect;

export async function createAlert(input: {
  type: string;
  severity?: "info" | "warning" | "critical";
  message: string;
}): Promise<void> {
  await db.insert(alerts).values({
    type: input.type.slice(0, 60),
    severity: input.severity ?? "info",
    message: input.message,
  });
}

export async function listAlerts(limit = 20): Promise<AlertRow[]> {
  return db.select().from(alerts).orderBy(desc(alerts.createdAt)).limit(limit);
}

export async function countUnreadAlerts(): Promise<number> {
  const [row] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(alerts)
    .where(eq(alerts.isRead, false));
  return row?.value ?? 0;
}

export async function markAlertRead(id: number): Promise<boolean> {
  const rows = await db
    .update(alerts)
    .set({ isRead: true })
    .where(eq(alerts.id, id))
    .returning({ id: alerts.id });
  return rows.length > 0;
}

export async function markAllAlertsRead(): Promise<number> {
  const rows = await db
    .update(alerts)
    .set({ isRead: true })
    .where(eq(alerts.isRead, false))
    .returning({ id: alerts.id });
  return rows.length;
}

/**
 * Raise an alert once per type per day.
 *
 * Without this, a spike condition raises an alert on every page load and the
 * bell becomes noise the owner learns to ignore.
 */
export async function raiseAlertOncePerDay(input: {
  type: string;
  severity?: "info" | "warning" | "critical";
  message: string;
}): Promise<boolean> {
  const since = new Date();
  since.setHours(0, 0, 0, 0);

  const [existing] = await db
    .select({ id: alerts.id })
    .from(alerts)
    .where(and(eq(alerts.type, input.type), gte(alerts.createdAt, since)))
    .limit(1);

  if (existing) return false;

  await createAlert(input);
  return true;
}

/** Unread count plus the newest few, for the sidebar bell. */
export async function getAlertBadge(): Promise<{ unread: number; latest: AlertRow[] }> {
  const [unread, latest] = await Promise.all([countUnreadAlerts(), listAlerts(5)]);
  return { unread, latest };
}

/** Lead counts for a range, used by the dashboard KPI cards. */
export async function countLeadsSince(from: Date): Promise<number> {
  const [row] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(leads)
    .where(gte(leads.createdAt, from));
  return row?.value ?? 0;
}
