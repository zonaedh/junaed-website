import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { nextFailedState, type LockoutState } from "./lockout-policy";

/**
 * Login lockout persistence (MVP.md §2).
 *
 * Rule: 5 failed attempts → locked for 15 minutes, counted per user row.
 * Per-IP limiting lives in Phase 8 (Upstash); this is the per-account half,
 * which works without any external service.
 *
 * The pure rules live in lockout-policy.ts so they can be tested without a
 * database. This file only reads and writes.
 */

export {
  isLocked,
  lockoutMinutesRemaining,
  lockoutMessage,
  MAX_FAILED_ATTEMPTS,
  LOCKOUT_MINUTES,
  type LockoutState,
} from "./lockout-policy";

/**
 * Record a failed attempt. Increments the counter and, on reaching the
 * threshold, sets `lockedUntil` and resets the counter so the next window
 * starts clean.
 */
export async function recordFailedAttempt(userId: number): Promise<LockoutState> {
  const rows = await db
    .update(users)
    .set({
      failedLoginCount: sql`${users.failedLoginCount} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning({
      failedLoginCount: users.failedLoginCount,
      lockedUntil: users.lockedUntil,
    });

  const current = rows[0];
  if (!current) return { failedLoginCount: 0, lockedUntil: null };

  const next = nextFailedState(current);

  // Only write when the policy actually changed something.
  if (next.lockedUntil !== current.lockedUntil || next.failedLoginCount !== current.failedLoginCount) {
    await db
      .update(users)
      .set({
        failedLoginCount: next.failedLoginCount,
        lockedUntil: next.lockedUntil,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  return next;
}

/** Clear the counter and any lock after a successful login. */
export async function clearFailedAttempts(userId: number): Promise<void> {
  await db
    .update(users)
    .set({
      failedLoginCount: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
}
