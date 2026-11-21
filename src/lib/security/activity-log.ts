/**
 * Activity log queries (MVP.md §8.3).
 *
 * SERVER ONLY.
 *
 * The writer lives in `lib/audit.ts` and is called from every mutation. This
 * file is the read side: filtering, pagination, and the retention clear.
 *
 * Two rules that shape the queries:
 *
 *  - **Never select more than a page.** The log grows without bound; an admin
 *    page that loads every row will eventually time out. Every read is limited.
 *  - **The clear is a range delete, never a truncate.** "Clear older than 90
 *    days" must not become "clear everything" because of a missing predicate,
 *    so the cutoff is always passed explicitly and always applied.
 */

import { and, count, desc, eq, gte, lt, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { activityLogs, users } from "@/db/schema";

export type ActivityRow = {
  id: number;
  action: string;
  entity: string | null;
  entityId: string | null;
  meta: Record<string, unknown> | null;
  ipHash: string | null;
  createdAt: Date;
  userId: number | null;
  userName: string | null;
  userEmail: string | null;
};

export type ActivityFilters = {
  userId?: number | null;
  /** Substring match on the action name, e.g. "auth.login". */
  action?: string | null;
  /** Inclusive lower bound. */
  from?: Date | null;
  /** Exclusive upper bound. */
  to?: Date | null;
  page?: number;
  pageSize?: number;
};

export type ActivityPage = {
  rows: ActivityRow[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

export const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;

function buildWhere(filters: ActivityFilters): SQL | undefined {
  const parts: SQL[] = [];

  if (filters.userId != null) {
    parts.push(eq(activityLogs.userId, filters.userId));
  }

  if (filters.action && filters.action.trim() !== "") {
    // Case-insensitive contains. `ilike` is Postgres-specific, which is fine:
    // the whole schema is Postgres.
    parts.push(sql`${activityLogs.action} ilike ${`%${filters.action.trim()}%`}`);
  }

  if (filters.from) {
    parts.push(gte(activityLogs.createdAt, filters.from));
  }

  if (filters.to) {
    parts.push(lt(activityLogs.createdAt, filters.to));
  }

  if (parts.length === 0) return undefined;
  return and(...parts);
}

/** One page of the log, newest first. */
export async function listActivity(filters: ActivityFilters = {}): Promise<ActivityPage> {
  const page = Math.max(1, Math.floor(filters.page ?? 1));
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Math.floor(filters.pageSize ?? DEFAULT_PAGE_SIZE)),
  );
  const where = buildWhere(filters);

  const rows = await db
    .select({
      id: activityLogs.id,
      action: activityLogs.action,
      entity: activityLogs.entity,
      entityId: activityLogs.entityId,
      meta: activityLogs.meta,
      ipHash: activityLogs.ipHash,
      createdAt: activityLogs.createdAt,
      userId: activityLogs.userId,
      userName: users.name,
      userEmail: users.email,
    })
    .from(activityLogs)
    .leftJoin(users, eq(users.id, activityLogs.userId))
    .where(where)
    .orderBy(desc(activityLogs.createdAt), desc(activityLogs.id))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const [totals] = await db
    .select({ value: count() })
    .from(activityLogs)
    .where(where);

  const total = Number(totals?.value ?? 0);

  return {
    rows,
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/** Distinct action names, for the filter dropdown. */
export async function listActionNames(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ action: activityLogs.action })
    .from(activityLogs)
    .orderBy(activityLogs.action);

  return rows.map((row) => row.action);
}

/** Users who appear in the log, for the filter dropdown. */
export async function listActors(): Promise<
  Array<{ id: number; name: string; email: string }>
> {
  const rows = await db
    .selectDistinct({ id: users.id, name: users.name, email: users.email })
    .from(activityLogs)
    .innerJoin(users, eq(users.id, activityLogs.userId))
    .orderBy(users.name);

  return rows;
}

export type ClearMode = "older_than_30" | "older_than_60" | "older_than_90" | "all";

export type ClearResult = { deleted: number; cutoff: Date | null };

/**
 * Delete log rows.
 *
 * `all` is the only mode without a cutoff, and it is deliberately a distinct
 * branch rather than "cutoff = now": the difference between the two is one
 * typo away from destroying the audit trail, and an explicit branch is easier
 * to read and to test.
 */
export async function clearActivity(mode: ClearMode): Promise<ClearResult> {
  if (mode === "all") {
    const rows = await db.delete(activityLogs).returning({ id: activityLogs.id });
    return { deleted: rows.length, cutoff: null };
  }

  const days = mode === "older_than_30" ? 30 : mode === "older_than_60" ? 60 : 90;
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const rows = await db
    .delete(activityLogs)
    .where(lt(activityLogs.createdAt, cutoff))
    .returning({ id: activityLogs.id });

  return { deleted: rows.length, cutoff };
}

/** How many rows the given mode would delete. Used for the confirmation text. */
export async function previewClear(mode: ClearMode): Promise<number> {
  if (mode === "all") {
    const [row] = await db.select({ value: count() }).from(activityLogs);
    return Number(row?.value ?? 0);
  }

  const days = mode === "older_than_30" ? 30 : mode === "older_than_60" ? 60 : 90;
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const [row] = await db
    .select({ value: count() })
    .from(activityLogs)
    .where(lt(activityLogs.createdAt, cutoff));

  return Number(row?.value ?? 0);
}

/** Oldest row still retained, for the "retention" line in the admin. */
export async function oldestEntry(): Promise<Date | null> {
  const [row] = await db
    .select({ createdAt: activityLogs.createdAt })
    .from(activityLogs)
    .orderBy(activityLogs.createdAt)
    .limit(1);

  return row?.createdAt ?? null;
}
