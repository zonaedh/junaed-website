import { describe, expect, it } from "vitest";
import {
  isLocked,
  lockoutMessage,
  lockoutMinutesRemaining,
  MAX_FAILED_ATTEMPTS,
  LOCKOUT_MINUTES,
  nextFailedState,
} from "./lockout-policy";

describe("lockout policy", () => {
  const now = new Date("2026-11-20T12:00:00Z");

  it("uses the documented thresholds", () => {
    expect(MAX_FAILED_ATTEMPTS).toBe(5);
    expect(LOCKOUT_MINUTES).toBe(15);
  });

  it("is not locked when lockedUntil is null", () => {
    expect(isLocked({ failedLoginCount: 4, lockedUntil: null }, now)).toBe(false);
  });

  it("is locked when lockedUntil is in the future", () => {
    const lockedUntil = new Date(now.getTime() + 60_000);
    expect(isLocked({ failedLoginCount: 0, lockedUntil }, now)).toBe(true);
  });

  it("is not locked once the lock has expired", () => {
    const lockedUntil = new Date(now.getTime() - 1_000);
    expect(isLocked({ failedLoginCount: 0, lockedUntil }, now)).toBe(false);
  });

  it("reports remaining minutes rounded up", () => {
    const lockedUntil = new Date(now.getTime() + 90_000); // 1.5 min
    expect(lockoutMinutesRemaining({ failedLoginCount: 0, lockedUntil }, now)).toBe(2);
  });

  it("reports zero minutes when not locked", () => {
    expect(
      lockoutMinutesRemaining({ failedLoginCount: 0, lockedUntil: null }, now),
    ).toBe(0);
    expect(
      lockoutMinutesRemaining(
        { failedLoginCount: 0, lockedUntil: new Date(now.getTime() - 5_000) },
        now,
      ),
    ).toBe(0);
  });
});

describe("nextFailedState", () => {
  const now = new Date("2026-11-20T12:00:00Z");

  it("increments the counter below the threshold", () => {
    const next = nextFailedState({ failedLoginCount: 0, lockedUntil: null }, now);
    expect(next.failedLoginCount).toBe(1);
    expect(next.lockedUntil).toBeNull();
  });

  it("does not lock before the fifth failure", () => {
    for (let i = 0; i < 4; i += 1) {
      const next = nextFailedState({ failedLoginCount: i, lockedUntil: null }, now);
      expect(next.lockedUntil).toBeNull();
      expect(next.failedLoginCount).toBe(i + 1);
    }
  });

  it("locks on the fifth failure and resets the counter", () => {
    const next = nextFailedState({ failedLoginCount: 4, lockedUntil: null }, now);
    expect(next.failedLoginCount).toBe(0);
    expect(next.lockedUntil).not.toBeNull();
    expect(next.lockedUntil!.getTime()).toBe(now.getTime() + 15 * 60 * 1000);
  });
});

describe("lockoutMessage", () => {
  it("uses the singular for one minute", () => {
    expect(lockoutMessage(1)).toContain("1 minute");
    expect(lockoutMessage(1)).not.toContain("1 minutes");
  });

  it("uses the plural above one minute", () => {
    expect(lockoutMessage(15)).toContain("15 minutes");
  });
});
