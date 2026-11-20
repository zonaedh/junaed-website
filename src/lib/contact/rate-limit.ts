/**
 * Rate limiting — Upstash Redis when configured, in-memory otherwise.
 *
 * SERVER ONLY.
 *
 * Why an adapter rather than a hard Upstash dependency: rate limiting is the
 * one part of the contact form that must not be skipped in development, and
 * Upstash credentials are not available yet. A memory limiter is correct for a
 * single dev process and wrong for production (it resets on every cold start
 * and is per-instance), so production refuses to fall back — the same
 * reasoning as the media storage adapter (D-027).
 *
 * Deliberately not using @upstash/ratelimit: the sliding-window algorithm is
 * twenty lines, and adding a dependency to avoid writing them is a poor trade
 * when the fallback has to exist anyway.
 */

export type RateLimitResult = {
  allowed: boolean;
  /** Requests still available in the current window. */
  remaining: number;
  /** Epoch ms when the window resets. */
  resetAt: number;
};

export type RateLimitRule = {
  /** Bucket name, e.g. "contact:ip". */
  name: string;
  /** Maximum requests allowed in the window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
};

/* ------------------------------- memory driver ------------------------------ */

type MemoryEntry = { count: number; resetAt: number };

const globalForLimiter = globalThis as unknown as {
  __jhRateLimit?: Map<string, MemoryEntry>;
};

function memoryStore(): Map<string, MemoryEntry> {
  globalForLimiter.__jhRateLimit ??= new Map();
  return globalForLimiter.__jhRateLimit;
}

function memoryLimit(key: string, rule: RateLimitRule, now: number): RateLimitResult {
  const store = memoryStore();
  const entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    const resetAt = now + rule.windowMs;
    store.set(key, { count: 1, resetAt });
    // Opportunistic cleanup: without it the map grows for the process lifetime.
    if (store.size > 5000) {
      for (const [candidate, value] of store) {
        if (value.resetAt <= now) store.delete(candidate);
      }
    }
    return { allowed: true, remaining: rule.limit - 1, resetAt };
  }

  if (entry.count >= rule.limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count += 1;
  return {
    allowed: true,
    remaining: rule.limit - entry.count,
    resetAt: entry.resetAt,
  };
}

/* ------------------------------- upstash driver ----------------------------- */

function upstashConfig(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return { url: url.replace(/\/+$/, ""), token };
}

export function hasUpstashConfig(): boolean {
  return upstashConfig() !== null;
}

/**
 * Fixed-window counter via Upstash's REST API.
 *
 * INCR then EXPIRE on first hit. Fixed windows allow a burst at a boundary
 * (up to 2x the limit across two adjacent windows), which is acceptable here:
 * the limit exists to stop floods, not to be exact.
 */
async function upstashLimit(
  key: string,
  rule: RateLimitRule,
  config: { url: string; token: string },
): Promise<RateLimitResult> {
  const windowSeconds = Math.max(1, Math.ceil(rule.windowMs / 1000));

  const response = await fetch(`${config.url}/pipeline`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([
      ["INCR", key],
      ["EXPIRE", key, String(windowSeconds), "NX"],
      ["TTL", key],
    ]),
    // A hung limiter must not hang the form.
    signal: AbortSignal.timeout(3000),
  });

  if (!response.ok) {
    throw new Error(`Upstash rate limit failed: ${response.status}`);
  }

  const data = (await response.json()) as Array<{ result: unknown }>;
  const count = Number(data[0]?.result ?? 0);
  const ttl = Number(data[2]?.result ?? windowSeconds);
  const resetAt = Date.now() + Math.max(0, ttl) * 1000;

  return {
    allowed: count <= rule.limit,
    remaining: Math.max(0, rule.limit - count),
    resetAt,
  };
}

/* --------------------------------- selection -------------------------------- */

/**
 * Check one rule for one subject.
 *
 * `subject` is a hashed IP or similar — never a raw IP (see lib/security/hash).
 */
export async function checkRateLimit(
  subject: string,
  rule: RateLimitRule,
): Promise<RateLimitResult> {
  const key = `rl:${rule.name}:${subject}`;
  const config = upstashConfig();

  if (config) {
    try {
      return await upstashLimit(key, rule, config);
    } catch (error) {
      // A limiter outage must not take the contact form down with it. Log and
      // allow; the spam filter and captcha are still in front of this.
      console.error("[rate-limit] Upstash unavailable, allowing request", error);
      return { allowed: true, remaining: 0, resetAt: Date.now() + rule.windowMs };
    }
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Rate limiting is not configured. Set UPSTASH_REDIS_REST_URL and " +
        "UPSTASH_REDIS_REST_TOKEN. The in-memory limiter is not safe in " +
        "production: it resets on every cold start and is per-instance.",
    );
  }

  return memoryLimit(key, rule, Date.now());
}

/** The rules the contact form applies. MVP.md §5.1. */
export const CONTACT_RULES: readonly RateLimitRule[] = [
  { name: "contact:burst", limit: 3, windowMs: 10 * 60 * 1000 },
  { name: "contact:daily", limit: 10, windowMs: 24 * 60 * 60 * 1000 },
];

/** Test seam. */
export function resetRateLimitStore(): void {
  memoryStore().clear();
}
