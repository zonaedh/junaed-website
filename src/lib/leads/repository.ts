/**
 * Leads repository — all database access for contact submissions.
 *
 * SERVER ONLY.
 *
 * The public insert path and the admin read path live together because they
 * share the row shape and the status vocabulary; splitting them would mean two
 * places to change when a column moves.
 *
 * Note the deliberate absence of caching here. Leads are written by the public
 * site and read by an admin who expects to see the new row immediately, so a
 * cache would be a bug generator for no measurable gain at this volume.
 */

import { and, count, desc, eq, gte, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { leads } from "@/db/schema";

/** The lead status vocabulary, derived from the pgEnum so it cannot drift. */
export type LeadStatus = (typeof leads.status.enumValues)[number];

export type LeadRow = typeof leads.$inferSelect;

export type NewLead = {
  name: string;
  email: string;
  phone?: string | null;
  service?: string | null;
  message: string;
  ipHash?: string | null;
  country?: string | null;
  userAgent?: string | null;
  referrer?: string | null;
  sourcePage?: string | null;
  messageHash?: string | null;
  status?: LeadStatus;
};

/** Insert a lead and return the stored row. */
export async function createLead(input: NewLead): Promise<LeadRow> {
  const [row] = await db
    .insert(leads)
    .values({
      name: input.name,
      email: input.email,
      phone: input.phone ?? null,
      service: input.service ?? null,
      message: input.message,
      ipHash: input.ipHash ?? null,
      country: input.country ?? null,
      userAgent: input.userAgent ?? null,
      referrer: input.referrer ?? null,
      sourcePage: input.sourcePage ?? null,
      messageHash: input.messageHash ?? null,
      status: input.status ?? "new",
    })
    .returning();
  return row;
}

/**
 * Has this exact message body been submitted before?
 *
 * Used by the spam scorer. Scoped to the last 30 days: an identical enquiry a
 * year apart is a coincidence, not spam.
 */
export async function hasRecentMessageHash(messageHash: string): Promise<boolean> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [row] = await db
    .select({ id: leads.id })
    .from(leads)
    .where(and(eq(leads.messageHash, messageHash), gte(leads.createdAt, since)))
    .limit(1);
  return Boolean(row);
}

export type LeadListFilters = {
  status?: LeadStatus | "all";
  search?: string;
  page?: number;
  perPage?: number;
};

export type LeadListResult = {
  rows: LeadRow[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
};

/** Paginated, filterable list for the admin table. */
export async function listLeads(
  filters: LeadListFilters = {},
): Promise<LeadListResult> {
  const page = Math.max(1, filters.page ?? 1);
  const perPage = Math.min(100, Math.max(5, filters.perPage ?? 25));
  const offset = (page - 1) * perPage;

  const conditions = [];
  if (filters.status && filters.status !== "all") {
    conditions.push(eq(leads.status, filters.status));
  }
  const search = filters.search?.trim();
  if (search) {
    const needle = `%${search}%`;
    conditions.push(
      or(
        ilike(leads.name, needle),
        ilike(leads.email, needle),
        ilike(leads.message, needle),
      ),
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, totalRow] = await Promise.all([
    db
      .select()
      .from(leads)
      .where(where)
      .orderBy(desc(leads.createdAt))
      .limit(perPage)
      .offset(offset),
    db.select({ value: count() }).from(leads).where(where),
  ]);

  const total = Number(totalRow[0]?.value ?? 0);

  return {
    rows,
    total,
    page,
    perPage,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
  };
}

/** One lead, for the detail panel. */
export async function getLead(id: number): Promise<LeadRow | null> {
  const [row] = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
  return row ?? null;
}

/** Change a lead's status. */
export async function setLeadStatus(
  id: number,
  status: LeadStatus,
): Promise<LeadRow | null> {
  const [row] = await db
    .update(leads)
    .set({ status })
    .where(eq(leads.id, id))
    .returning();
  return row ?? null;
}

/** Save internal notes. */
export async function setLeadNotes(
  id: number,
  notes: string,
): Promise<LeadRow | null> {
  const [row] = await db
    .update(leads)
    .set({ notes })
    .where(eq(leads.id, id))
    .returning();
  return row ?? null;
}

/** Hard delete. Leads are the one table where a real delete is right. */
export async function deleteLead(id: number): Promise<boolean> {
  const rows = await db.delete(leads).where(eq(leads.id, id)).returning({
    id: leads.id,
  });
  return rows.length > 0;
}

/** Count of leads still in `new`, for the sidebar badge. */
export async function countUnreadLeads(): Promise<number> {
  const [row] = await db
    .select({ value: count() })
    .from(leads)
    .where(eq(leads.status, "new"));
  return Number(row?.value ?? 0);
}

/** Everything, for CSV export. Capped so an export cannot exhaust memory. */
export async function listLeadsForExport(limit = 5000): Promise<LeadRow[]> {
  return db.select().from(leads).orderBy(desc(leads.createdAt)).limit(limit);
}

/** Distinct source pages, for the filter dropdown. */
export async function listLeadSources(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ source: leads.sourcePage })
    .from(leads)
    .where(sql`${leads.sourcePage} is not null`);
  return rows
    .map((row) => row.source)
    .filter((value): value is string => Boolean(value))
    .sort();
}
