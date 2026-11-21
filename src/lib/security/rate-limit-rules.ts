/**
 * Rate-limit rules — pure data, no I/O.
 *
 * MVP.md §8.1. The rules live here rather than beside the limiter so the proxy
 * (which must stay fast and dependency-light) and the Server Actions can both
 * import them without pulling in anything server-only.
 *
 * Numbers are chosen for the failure they prevent, not for elegance:
 *
 *  - `global:public` is generous. A real visitor loading a page with images
 *    and prefetches can easily hit 40 requests; 120/min still stops a flood.
 *  - `api:track` is tighter because the beacon fires once per navigation and a
 *    legitimate visitor never approaches 60.
 *  - `auth:login` is the one that matters. Five attempts per fifteen minutes
 *    matches the account lockout policy, so the IP limit and the account limit
 *    agree instead of one silently being the real ceiling.
 */

export type RateLimitRule = {
  /** Bucket name, e.g. "auth:login". */
  name: string;
  /** Maximum requests allowed in the window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
};

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

/** Applied to every public request in the proxy. */
export const GLOBAL_PUBLIC_RULE: RateLimitRule = {
  name: "global:public",
  limit: 120,
  windowMs: MINUTE,
};

/** Applied to every /api/* request in the proxy. */
export const GLOBAL_API_RULE: RateLimitRule = {
  name: "global:api",
  limit: 60,
  windowMs: MINUTE,
};

/** The page-view beacon. One per navigation, so 60/min is already generous. */
export const TRACK_RULE: RateLimitRule = {
  name: "api:track",
  limit: 60,
  windowMs: MINUTE,
};

/** Login attempts per IP. Matches the account lockout threshold (D-040). */
export const LOGIN_RULE: RateLimitRule = {
  name: "auth:login",
  limit: 5,
  windowMs: 15 * MINUTE,
};

/** Password reset requests per IP. */
export const PASSWORD_RESET_RULE: RateLimitRule = {
  name: "auth:reset",
  limit: 3,
  windowMs: HOUR,
};

/** Contact submissions — kept in step with the Phase 5 rules. */
export const CONTACT_RULES: readonly RateLimitRule[] = [
  { name: "contact:burst", limit: 3, windowMs: 10 * MINUTE },
  { name: "contact:daily", limit: 10, windowMs: 24 * HOUR },
];

/**
 * Which rule applies to a path, if any.
 *
 * Returns null for paths that are not limited here (static assets never reach
 * the proxy, and the admin tree has its own guards).
 */
export function ruleForPath(pathname: string): RateLimitRule | null {
  if (pathname.startsWith("/api/track")) return TRACK_RULE;
  if (pathname.startsWith("/api/")) return GLOBAL_API_RULE;
  return GLOBAL_PUBLIC_RULE;
}

/**
 * Seconds until the window resets, for the `Retry-After` header.
 *
 * Always at least 1: a `Retry-After: 0` invites an immediate retry, which is
 * the opposite of the intent.
 */
export function retryAfterSeconds(resetAt: number, now = Date.now()): number {
  const remainingMs = resetAt - now;
  return Math.max(1, Math.ceil(remainingMs / 1000));
}
