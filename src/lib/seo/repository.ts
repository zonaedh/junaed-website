/**
 * SEO repository — redirects, the 404 log, and the resolved SEO settings.
 *
 * SERVER ONLY. Client components import `./core` instead.
 *
 * Redirects are read on the hot path (every proxy request), so the read is
 * cached under its own tag and invalidated on every admin write. The 404 log is
 * write-heavy and read rarely, so it is never cached.
 */

import { unstable_cache } from "next/cache";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { notFoundLog, redirects } from "@/db/schema";
import { getSettings } from "@/lib/settings";
import { canonicalPath, truncateAtWord } from "./core";

/* -------------------------------- redirects -------------------------------- */

export type RedirectRow = typeof redirects.$inferSelect;

export type NewRedirect = {
  fromPath: string;
  toPath: string;
  code?: number;
  isActive?: boolean;
};

/**
 * Normalise a redirect path so `/blog/`, `blog` and `/blog` are one entry.
 * A redirect that only fires for the exact string the owner typed is a bug
 * waiting to be reported as "the redirect doesn't work".
 */
/**
 * Next's `permanentRedirect()` emits 308 and `redirect()` emits 307 — there is
 * no API that sends a literal 301 or 302. Rather than store a code we will not
 * honour, the two permanent codes collapse to 308 and the two temporary ones to
 * 307. Both are correct for SEO: 308 and 301 are equally permanent, and 307 is
 * the method-preserving form of 302.
 */
export function effectiveRedirectCode(code: number): number {
  if (code === 301 || code === 308) return 308;
  return 307;
}

export function normaliseRedirectPath(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "/";
  // Absolute URLs are allowed as a destination; normalise only the path part
  // for the `from` side, which is always local.
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return canonicalPath(trimmed);
}

/**
 * The active redirect map, cached.
 *
 * Returned as a plain record rather than an array because the proxy does a
 * lookup per request and a map is the right shape for that.
 */
const readRedirectMap = unstable_cache(
  async (): Promise<Record<string, { to: string; code: number }>> => {
    const rows = await db
      .select({
        fromPath: redirects.fromPath,
        toPath: redirects.toPath,
        code: redirects.code,
      })
      .from(redirects)
      .where(eq(redirects.isActive, true));

    const map: Record<string, { to: string; code: number }> = {};
    for (const row of rows) {
      map[normaliseRedirectPath(row.fromPath)] = {
        to: row.toPath,
        code: row.code,
      };
    }
    return map;
  },
  ["seo-redirects"],
  { tags: ["redirects"], revalidate: false },
);

export async function getRedirectMap() {
  return readRedirectMap();
}

/** Uncached list for the admin table. */
export async function listRedirects(): Promise<RedirectRow[]> {
  return db.select().from(redirects).orderBy(desc(redirects.createdAt));
}

export async function createRedirect(input: NewRedirect): Promise<RedirectRow> {
  const [row] = await db
    .insert(redirects)
    .values({
      fromPath: normaliseRedirectPath(input.fromPath),
      toPath: input.toPath.trim(),
      code: effectiveRedirectCode(input.code ?? 301),
      isActive: input.isActive ?? true,
    })
    .returning();
  return row;
}

export async function updateRedirect(
  id: number,
  input: Partial<NewRedirect>,
): Promise<RedirectRow | null> {
  const [row] = await db
    .update(redirects)
    .set({
      ...(input.fromPath !== undefined
        ? { fromPath: normaliseRedirectPath(input.fromPath) }
        : {}),
      ...(input.toPath !== undefined ? { toPath: input.toPath.trim() } : {}),
      ...(input.code !== undefined ? { code: effectiveRedirectCode(input.code) } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    })
    .where(eq(redirects.id, id))
    .returning();
  return row ?? null;
}

export async function deleteRedirect(id: number): Promise<boolean> {
  const rows = await db
    .delete(redirects)
    .where(eq(redirects.id, id))
    .returning({ id: redirects.id });
  return rows.length > 0;
}

/* -------------------------------- 404 log ---------------------------------- */

export type NotFoundRow = typeof notFoundLog.$inferSelect;

/**
 * Record a 404.
 *
 * Uses an upsert on the path so a crawler hammering one dead URL produces one
 * row with a rising hit count instead of ten thousand rows. That is the whole
 * point of the log: show the owner the *distinct* broken URLs, ranked.
 */
export async function recordNotFound(input: {
  path: string;
  referrer?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  const path = input.path.slice(0, 500);

  await db
    .insert(notFoundLog)
    .values({
      path,
      referrer: input.referrer?.slice(0, 500) ?? null,
      userAgent: input.userAgent?.slice(0, 300) ?? null,
      hits: 1,
    })
    .onConflictDoUpdate({
      target: notFoundLog.path,
      set: {
        hits: sql`${notFoundLog.hits} + 1`,
        lastSeenAt: new Date(),
        referrer: input.referrer?.slice(0, 500) ?? null,
      },
    });
}

/** Top broken URLs, most hit first. Uncached: the owner expects live numbers. */
export async function listNotFound(limit = 50): Promise<NotFoundRow[]> {
  return db
    .select()
    .from(notFoundLog)
    .orderBy(desc(notFoundLog.hits), desc(notFoundLog.lastSeenAt))
    .limit(limit);
}

export async function deleteNotFound(id: number): Promise<boolean> {
  const rows = await db
    .delete(notFoundLog)
    .where(eq(notFoundLog.id, id))
    .returning({ id: notFoundLog.id });
  return rows.length > 0;
}

export async function clearNotFoundLog(): Promise<number> {
  const rows = await db.delete(notFoundLog).returning({ id: notFoundLog.id });
  return rows.length;
}

/* ----------------------------- resolved SEO settings ----------------------- */

export type SeoDefaults = {
  titleTemplate: string;
  defaultDescription: string;
  defaultOgImage: string;
  twitterHandle: string;
  googleVerification: string;
  bingVerification: string;
  siteUrl: string;
  siteName: string;
  siteDescription: string;
  contactEmail: string;
  contactPhone: string;
  socialLinks: string[];
};

/**
 * Resolve the SEO defaults from settings, with a description fallback that is
 * already trimmed to a sensible length.
 *
 * This is the one place that knows which setting key feeds which SEO field, so
 * a key rename touches this function and nothing else.
 */
export async function getSeoDefaults(): Promise<SeoDefaults> {
  const settings = await getSettings();

  const socialLinks = [
    settings.socialLinkedin,
    settings.socialGithub,
    settings.socialTwitter,
  ]
    .map((value) => (value ?? "").trim())
    .filter((value) => value.length > 0);

  return {
    titleTemplate: settings.titleTemplate || `%s | ${settings.name}`,
    defaultDescription:
      settings.defaultDescription || truncateAtWord(settings.description, 160),
    defaultOgImage: settings.defaultOgImage || "",
    twitterHandle: settings.twitterHandle || "",
    googleVerification: settings.googleVerification || "",
    bingVerification: settings.bingVerification || "",
    siteUrl: settings.siteUrl || "https://junaedhossain.com",
    siteName: settings.name,
    siteDescription: settings.description,
    contactEmail: settings.email || "",
    contactPhone: settings.phone || "",
    socialLinks,
  };
}

/** Verification metadata, only when the owner has actually set a code. */
export function verificationMetadata(defaults: SeoDefaults) {
  const google = defaults.googleVerification.trim();
  const other: Record<string, string> = {};
  if (defaults.bingVerification.trim()) {
    other["msvalidate.01"] = defaults.bingVerification.trim();
  }
  if (!google && Object.keys(other).length === 0) return undefined;
  return {
    ...(google ? { google } : {}),
    ...(Object.keys(other).length > 0 ? { other } : {}),
  };
}

/** Count rows in the 404 log, for the admin nav badge. */
export async function countNotFound(): Promise<number> {
  const [row] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(notFoundLog);
  return row?.value ?? 0;
}

/** Only the active redirects, for a quick count in the admin. */
export async function countActiveRedirects(): Promise<number> {
  const [row] = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(redirects)
    .where(and(eq(redirects.isActive, true)));
  return row?.value ?? 0;
}
