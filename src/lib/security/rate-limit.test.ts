import { beforeEach, describe, expect, it } from "vitest";
import { hit, limiterSize, resetLimiter } from "./proxy-limiter";
import {
  GLOBAL_API_RULE,
  GLOBAL_PUBLIC_RULE,
  LOGIN_RULE,
  retryAfterSeconds,
  ruleForPath,
  TRACK_RULE,
} from "./rate-limit-rules";

/**
 * Limiter and rule tests (MVP.md §8.1).
 *
 * The important behaviours: the window resets rather than counting forever, the
 * limit is inclusive of the last allowed request, and Retry-After never returns
 * zero (which would invite an immediate retry).
 */

beforeEach(() => {
  resetLimiter();
});

describe("hit", () => {
  it("allows requests up to the limit", () => {
    const now = 1_000_000;
    for (let i = 0; i < 5; i += 1) {
      expect(hit("k", 5, 1000, now).allowed).toBe(true);
    }
  });

  it("blocks the request after the limit", () => {
    const now = 1_000_000;
    for (let i = 0; i < 5; i += 1) hit("k", 5, 1000, now);
    const blocked = hit("k", 5, 1000, now);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
  });

  it("reports remaining countdown", () => {
    const now = 1_000_000;
    expect(hit("k", 3, 1000, now).remaining).toBe(2);
    expect(hit("k", 3, 1000, now).remaining).toBe(1);
    expect(hit("k", 3, 1000, now).remaining).toBe(0);
  });

  it("resets after the window passes", () => {
    const now = 1_000_000;
    for (let i = 0; i < 5; i += 1) hit("k", 5, 1000, now);
    expect(hit("k", 5, 1000, now).allowed).toBe(false);
    expect(hit("k", 5, 1000, now + 1001).allowed).toBe(true);
  });

  it("keeps separate counters per key", () => {
    const now = 1_000_000;
    for (let i = 0; i < 5; i += 1) hit("a", 5, 1000, now);
    expect(hit("a", 5, 1000, now).allowed).toBe(false);
    expect(hit("b", 5, 1000, now).allowed).toBe(true);
  });

  it("returns the window reset time", () => {
    const now = 1_000_000;
    const outcome = hit("k", 5, 1000, now);
    expect(outcome.resetAt).toBe(now + 1000);
  });

  it("reuses an expired key rather than blocking it forever", () => {
    const now = 1_000_000;
    for (let i = 0; i < 5; i += 1) hit("k", 5, 1000, now);
    expect(hit("k", 5, 1000, now).allowed).toBe(false);
    // Past the window the same key starts a fresh count.
    expect(hit("k", 5, 1000, now + 5000).allowed).toBe(true);
    expect(limiterSize()).toBe(1);
  });
});

describe("ruleForPath", () => {
  it("uses the track rule for the beacon", () => {
    expect(ruleForPath("/api/track")).toBe(TRACK_RULE);
  });

  it("uses the api rule for other api paths", () => {
    expect(ruleForPath("/api/anything")).toBe(GLOBAL_API_RULE);
  });

  it("uses the public rule for pages", () => {
    expect(ruleForPath("/blog")).toBe(GLOBAL_PUBLIC_RULE);
    expect(ruleForPath("/")).toBe(GLOBAL_PUBLIC_RULE);
  });
});

describe("retryAfterSeconds", () => {
  it("rounds up to whole seconds", () => {
    expect(retryAfterSeconds(10_500, 10_000)).toBe(1);
    expect(retryAfterSeconds(12_000, 10_000)).toBe(2);
  });

  it("never returns zero", () => {
    expect(retryAfterSeconds(10_000, 10_000)).toBe(1);
    expect(retryAfterSeconds(9_000, 10_000)).toBe(1);
  });
});

describe("rule definitions", () => {
  it("keeps login attempts in step with the lockout threshold", () => {
    // MAX_FAILED_ATTEMPTS is 5; the IP limit must not be looser than that.
    expect(LOGIN_RULE.limit).toBe(5);
    expect(LOGIN_RULE.windowMs).toBe(15 * 60 * 1000);
  });

  it("gives the public rule more room than the api rule", () => {
    expect(GLOBAL_PUBLIC_RULE.limit).toBeGreaterThan(GLOBAL_API_RULE.limit);
  });
});
