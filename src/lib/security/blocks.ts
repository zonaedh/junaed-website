/**
 * Block-list repository (MVP.md §8.2).
 *
 * SERVER ONLY.
 *
 * The proxy enforces the list, and the Next docs are explicit that the proxy is
 * not for slow data fetching. So the list is read through a short-lived
 * in-process cache: a block takes effect within `CACHE_TTL_MS` on every
 * instance, and the proxy never touches the database on the request path.
 *
 * Why not `unstable_cache`: that is request-scoped and tagged for revalidation,
 * which is the wrong shape inside the proxy. A plain module-level cache with a
 * timestamp is honest about what it is — a cache with a known staleness window.
 *
 * Expiry is applied on read, not by a scheduled job: an entry whose `expiresAt`
 * has passed simply stops matching. That means an expired block stops working
 * even if nothing has swept the row yet, which is the safe direction.
 */

import { and, desc, eq, isNull, or, gt } from "drizzle-orm";
import { db } from "@/db";
import { activityLogs, alerts, blockedIps, users } from "@/db/schema";
import { ACTIONS, logActivity } from "@/lib/audit";
import { normaliseBlockEntry } from "@/lib/security/ip";

export type BlockRow = typeof blockedIps.$inferSelect;

export type BlockWithAuthor = BlockRow & {
  createdByName: string | null;
};

/** How long an instance may serve a stale list. One minute is a good trade. */
const CACHE_TTL_MS = 60 * 1000;

type CacheState = {
  entries: string[];
  loadedAt: number;
};

const globalForBlocks = globalThis as unknown as {
  __jhBlockCache?: CacheState;
};

/**
 * The active entries, cached.
 *
 * Returns only entries that are live right now: no `expiresAt`, or one in the
 * future. Expired rows are kept in the table so the admin can see what was
 * blocked and why, but they never match.
 */
export async function getActiveBlockEntries(): Promise<string[]> {
  const cached = globalForBlocks.__jhBlockCache;
  const now = Date.now();

  if (cached && now - cached.loadedAt < CACHE_TTL_MS) {
    return cached.entries;
  }

  try {
    const rows = await db
      .select({ ip: blockedIps.ip })
      .from(blockedIps)
      .where(
        or(isNull(blockedIps.expiresAt), gt(blockedIps.expiresAt, new Date(now))),
      );

    const entries = rows.map((row) => row.ip);
    globalForBlocks.__jhBlockCache = { entries, loadedAt: now };
    return entries;
  } catch (error) {
    // A database blip must not open the door or take the site down. Serve the
    // last known list if there is one; otherwise fail open on the block list
    // and let the rate limiter carry the load.
    console.error("[blocks] failed to load block list", error);
    return cached?.entries ?? [];
  }
}

/** Drop the cache so the next read sees a change immediately. */
export function invalidateBlockCache(): void {
  globalForBlocks.__jhBlockCache = undefined;
}

/** Every row, newest first, for the admin table. Uncached. */
export async function listBlocks(): Promise<BlockWithAuthor[]> {
  const rows = await db
    .select({
      id: blockedIps.id,
      ip: blockedIps.ip,
      reason: blockedIps.reason,
      createdBy: blockedIps.createdBy,
      expiresAt: blockedIps.expiresAt,
      createdAt: blockedIps.createdAt,
      createdByName: users.name,
    })
    .from(blockedIps)
    .leftJoin(users, eq(users.id, blockedIps.createdBy))
    .orderBy(desc(blockedIps.createdAt));

  return rows;
}

export type AddBlockResult =
  | { ok: true; row: BlockRow }
  | { ok: false; error: string };

/**
 * Add an entry.
 *
 * The address is normalised first: a typo like `203.0.113.0/33` would otherwise
 * be stored and silently never match, which is worse than a visible error.
 */
export async function addBlock(input: {
  ip: string;
  reason: string | null;
  expiresAt: Date | null;
  createdBy: number | null;
}): Promise<AddBlockResult> {
  const normalised = normaliseBlockEntry(input.ip);
  if (!normalised) {
    return {
      ok: false,
      error: "That is not a valid IP address or CIDR range.",
    };
  }

  if (input.expiresAt && input.expiresAt.getTime() <= Date.now()) {
    return { ok: false, error: "The expiry must be in the future." };
  }

  try {
    const [row] = await db
      .insert(blockedIps)
      .values({
        ip: normalised,
        reason: input.reason?.trim() || null,
        expiresAt: input.expiresAt,
        createdBy: input.createdBy,
      })
      .returning();

    invalidateBlockCache();
    return { ok: true, row };
  } catch (error) {
    // The unique index on `ip` is the only expected failure.
    const message = error instanceof Error ? error.message : "";
    if (message.includes("blocked_ips_ip_unique")) {
      return { ok: false, error: "That address is already blocked." };
    }
    console.error("[blocks] insert failed", error);
    return { ok: false, error: "Could not add that block. Try again." };
  }
}

/** Remove an entry. Returns false when the id does not exist. */
export async function removeBlock(id: number): Promise<boolean> {
  const rows = await db
    .delete(blockedIps)
    .where(eq(blockedIps.id, id))
    .returning({ id: blockedIps.id });

  if (rows.length > 0) invalidateBlockCache();
  return rows.length > 0;
}

/** Is this exact entry already blocked? Used to avoid duplicate alerts. */
export async function isBlocked(ip: string): Promise<boolean> {
  const normalised = normaliseBlockEntry(ip);
  if (!normalised) return false;

  const rows = await db
    .select({ id: blockedIps.id })
    .from(blockedIps)
    .where(
      and(
        eq(blockedIps.ip, normalised),
        or(isNull(blockedIps.expiresAt), gt(blockedIps.expiresAt, new Date())),
      ),
    )
    .limit(1);

  return rows.length > 0;
}

/**
 * Auto-block an address after repeated spam (MVP.md §8.2).
 *
 * Counts blocked submissions for this address in the last 24 hours from the
 * activity log, and blocks once the threshold is crossed. Two deliberate
 * choices:
 *
 *  - **It counts, it does not react.** One false positive must never block a
 *    real person, so the threshold is at least 2 and the default is 3.
 *  - **The block is temporary.** Auto-blocks expire after 24 hours, so a
 *    shared NAT address (an office, a mobile carrier) recovers on its own
 *    instead of being permanently locked out by one bad actor behind it.
 *
 * Returns the entry that was added, or null when nothing happened.
 */
export async function maybeAutoBlock(input: {
  ip: string | null;
  ipHash: string | null;
  threshold: number;
}): Promise<string | null> {
  if (!input.ip || !input.ipHash) return null;
  // 0 disables the feature; 1 would block on a single false positive.
  if (input.threshold < 2) return null;

  const normalised = normaliseBlockEntry(input.ip);
  if (!normalised) return null;

  try {
    if (await isBlocked(normalised)) return null;

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const rows = await db
      .select({ id: activityLogs.id })
      .from(activityLogs)
      .where(
        and(
          eq(activityLogs.action, ACTIONS.spamBlocked),
          eq(activityLogs.ipHash, input.ipHash),
          gt(activityLogs.createdAt, since),
        ),
      );

    if (rows.length < input.threshold) return null;

    const result = await addBlock({
      ip: normalised,
      reason: `Automatic: ${rows.length} spam submissions in 24 hours.`,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      createdBy: null,
    });

    if (!result.ok) return null;

    await logActivity({
      action: ACTIONS.ipAutoBlocked,
      entity: "blocked_ip",
      entityId: result.row.id,
      meta: { ip: normalised, attempts: rows.length, expiresInHours: 24 },
    });

    await db.insert(alerts).values({
      type: "security.ip_auto_blocked",
      severity: "warning",
      message: `${normalised} was blocked automatically after ${rows.length} spam submissions in 24 hours.`,
    });

    return normalised;
  } catch (error) {
    // Auto-blocking is a convenience; a failure must not break the form.
    console.error("[blocks] auto-block failed", error);
    return null;
  }
}
