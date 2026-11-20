/**
 * Lockout policy — pure logic, no database access.
 *
 * Kept separate from lockout.ts so the rules can be unit-tested without a
 * database connection, and so the thresholds have exactly one definition.
 */

export const MAX_FAILED_ATTEMPTS = 5;
export const LOCKOUT_MINUTES = 15;

export type LockoutState = {
  failedLoginCount: number;
  lockedUntil: Date | null;
};

export function isLocked(state: LockoutState, now = new Date()): boolean {
  return state.lockedUntil !== null && state.lockedUntil > now;
}

/** Remaining lockout in whole minutes, for a user-facing message. */
export function lockoutMinutesRemaining(
  state: LockoutState,
  now = new Date(),
): number {
  if (!state.lockedUntil) return 0;
  const ms = state.lockedUntil.getTime() - now.getTime();
  return ms > 0 ? Math.ceil(ms / 60000) : 0;
}

/**
 * Decide what the next state should be after one more failed attempt.
 * Pure: the caller persists the result.
 */
export function nextFailedState(
  current: LockoutState,
  now = new Date(),
): LockoutState {
  const attempts = current.failedLoginCount + 1;

  if (attempts >= MAX_FAILED_ATTEMPTS) {
    return {
      failedLoginCount: 0,
      lockedUntil: new Date(now.getTime() + LOCKOUT_MINUTES * 60 * 1000),
    };
  }

  return { failedLoginCount: attempts, lockedUntil: current.lockedUntil };
}

/** Message shown for a locked account. Actionable without revealing whether
 *  the account exists. */
export function lockoutMessage(minutes: number): string {
  return `Too many failed attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`;
}
