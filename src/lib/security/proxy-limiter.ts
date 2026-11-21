/**
 * Fast in-process rate limiter for the proxy (MVP.md §8.1).
 *
 * SERVER ONLY, but deliberately dependency-free: no database, no network, no
 * `node:` imports. The proxy runs on every request and the Next docs are
 * explicit that it is not the place for slow data fetching, so a Redis round
 * trip per request would be exactly the wrong shape here.
 *
 * What this is: a fixed-window counter per key, held in process memory. It
 * stops a single client flooding one instance. It is NOT a distributed limiter
 * — on Vercel each instance has its own counters, so the effective limit is
 * `limit × instances`. That is an accepted trade (D-040): the proxy limiter is
 * a cheap first gate, and the per-endpoint limits in Server Actions use the
 * Upstash-backed limiter where exactness matters.
 *
 * Memory is bounded: expired entries are swept opportunistically, and the map
 * is capped so a spoofed-IP flood cannot grow it without limit.
 */

export type LimitOutcome = {
  allowed: boolean;
  remaining: number;
  /** Epoch ms when the current window resets. */
  resetAt: number;
};

type Entry = { count: number; resetAt: number };

/** Hard cap on tracked keys. Beyond this, the oldest entries are dropped. */
const MAX_KEYS = 10_000;

const globalForLimiter = globalThis as unknown as {
  __jhProxyLimiter?: Map<string, Entry>;
};

function store(): Map<string, Entry> {
  globalForLimiter.__jhProxyLimiter ??= new Map();
  return globalForLimiter.__jhProxyLimiter;
}

/** Drop expired entries. Called only when the map grows past a threshold. */
function sweep(map: Map<string, Entry>, now: number): void {
  for (const [key, entry] of map) {
    if (entry.resetAt <= now) map.delete(key);
  }

  // Still too large after sweeping: drop oldest-inserted keys. Map preserves
  // insertion order, so the first entries are the oldest. This is a blunt
  // instrument on purpose — under a flood, protecting memory beats precision.
  if (map.size > MAX_KEYS) {
    let excess = map.size - MAX_KEYS;
    for (const key of map.keys()) {
      if (excess <= 0) break;
      map.delete(key);
      excess -= 1;
    }
  }
}

/**
 * Count one request against a key.
 *
 * Synchronous by design: the proxy cannot await a limiter without adding
 * latency to every request.
 */
export function hit(
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now(),
): LimitOutcome {
  const map = store();
  const entry = map.get(key);

  if (!entry || entry.resetAt <= now) {
    const resetAt = now + windowMs;
    map.set(key, { count: 1, resetAt });
    if (map.size > MAX_KEYS / 2) sweep(map, now);
    return { allowed: true, remaining: Math.max(0, limit - 1), resetAt };
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count += 1;
  return { allowed: true, remaining: Math.max(0, limit - entry.count), resetAt: entry.resetAt };
}

/** Test seam: clear all counters. */
export function resetLimiter(): void {
  store().clear();
}

/** Test seam: how many keys are tracked. */
export function limiterSize(): number {
  return store().size;
}
