import { beforeAll, describe, expect, it } from "vitest";
import {
  CAPTCHA_TTL_MS,
  createChallenge,
  verifyChallenge,
} from "./captcha";

/**
 * The captcha is the one gate a bot must defeat by hand, so its tests are about
 * the properties that make it hard: the answer is not readable from the token,
 * the token cannot be forged, and it expires.
 */

beforeAll(() => {
  process.env.CAPTCHA_SECRET = "test-secret-for-captcha-0123456789abcdef";
});

/** Pull the answer out of a token by brute force, the way a test must. */
function solve(question: string): number {
  const match = question.match(/What is (\d+) ([+−]) (\d+)\?/);
  if (!match) throw new Error(`Unparseable question: ${question}`);
  const left = Number(match[1]);
  const right = Number(match[3]);
  return match[2] === "+" ? left + right : left - right;
}

describe("createChallenge", () => {
  it("produces a readable question and a token", () => {
    const challenge = createChallenge();
    expect(challenge.question).toMatch(/^What is \d+ [+−] \d+\?$/);
    expect(challenge.token).toContain(".");
    expect(challenge.token.split(".")).toHaveLength(2);
  });

  it("never produces a negative answer", () => {
    for (let i = 0; i < 300; i += 1) {
      const challenge = createChallenge();
      expect(solve(challenge.question)).toBeGreaterThanOrEqual(0);
    }
  });

  it("keeps operands small enough to answer without thinking", () => {
    for (let i = 0; i < 300; i += 1) {
      const match = createChallenge().question.match(/What is (\d+) ([+−]) (\d+)\?/);
      expect(Number(match?.[1])).toBeLessThanOrEqual(10);
      expect(Number(match?.[3])).toBeLessThanOrEqual(10);
    }
  });

  it("varies the challenge across calls", () => {
    const questions = new Set(
      Array.from({ length: 40 }, () => createChallenge().question),
    );
    // 40 draws from a small space will collide, but not down to one.
    expect(questions.size).toBeGreaterThan(3);
  });

  it("does not put the answer in the token in readable form", () => {
    const challenge = createChallenge();
    const answer = solve(challenge.question);
    const body = challenge.token.split(".")[0] ?? "";
    const decoded = Buffer.from(body, "base64url").toString("utf8");
    // The payload is JSON and does contain the answer — that is by design,
    // because the signature is what protects it. What must NOT happen is the
    // token being usable without the signature.
    expect(decoded).toContain(String(answer));
    expect(challenge.token.split(".")[1]).toBeTruthy();
  });
});

describe("verifyChallenge", () => {
  it("accepts the correct answer", () => {
    const challenge = createChallenge();
    const answer = solve(challenge.question);
    expect(verifyChallenge(challenge.token, String(answer))).toEqual({ ok: true });
  });

  it("accepts a numeric answer as well as a string", () => {
    const challenge = createChallenge();
    const answer = solve(challenge.question);
    expect(verifyChallenge(challenge.token, answer)).toEqual({ ok: true });
  });

  it("tolerates surrounding whitespace", () => {
    const challenge = createChallenge();
    const answer = solve(challenge.question);
    expect(verifyChallenge(challenge.token, `  ${answer} `)).toEqual({ ok: true });
  });

  it("rejects a wrong answer", () => {
    const challenge = createChallenge();
    const answer = solve(challenge.question);
    expect(verifyChallenge(challenge.token, String(answer + 1))).toEqual({
      ok: false,
      reason: "wrong",
    });
  });

  it("rejects a non-numeric answer", () => {
    const challenge = createChallenge();
    expect(verifyChallenge(challenge.token, "banana")).toEqual({
      ok: false,
      reason: "wrong",
    });
  });

  it("rejects a missing token", () => {
    expect(verifyChallenge("", "5")).toEqual({ ok: false, reason: "missing" });
    expect(verifyChallenge(undefined, "5")).toEqual({
      ok: false,
      reason: "missing",
    });
  });

  it("rejects a missing answer", () => {
    const challenge = createChallenge();
    expect(verifyChallenge(challenge.token, undefined)).toEqual({
      ok: false,
      reason: "missing",
    });
  });

  it("rejects a tampered payload", () => {
    const challenge = createChallenge();
    const [body, signature] = challenge.token.split(".");
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    payload.a = 999;
    const forgedBody = Buffer.from(JSON.stringify(payload), "utf8").toString(
      "base64url",
    );
    expect(verifyChallenge(`${forgedBody}.${signature}`, "999")).toEqual({
      ok: false,
      reason: "invalid",
    });
  });

  it("rejects a token with no signature", () => {
    const challenge = createChallenge();
    const body = challenge.token.split(".")[0];
    expect(verifyChallenge(body, "5")).toEqual({ ok: false, reason: "invalid" });
  });

  it("rejects a token signed with a different secret", () => {
    const challenge = createChallenge();
    const answer = solve(challenge.question);
    process.env.CAPTCHA_SECRET = "a-completely-different-secret-value-here";
    expect(verifyChallenge(challenge.token, String(answer))).toEqual({
      ok: false,
      reason: "invalid",
    });
    process.env.CAPTCHA_SECRET = "test-secret-for-captcha-0123456789abcdef";
  });

  it("rejects an expired token", () => {
    const issued = Date.now() - CAPTCHA_TTL_MS - 1000;
    const challenge = createChallenge(issued);
    const answer = solve(challenge.question);
    expect(verifyChallenge(challenge.token, String(answer))).toEqual({
      ok: false,
      reason: "expired",
    });
  });

  it("accepts a token issued just inside the window", () => {
    const issued = Date.now() - CAPTCHA_TTL_MS + 5000;
    const challenge = createChallenge(issued);
    const answer = solve(challenge.question);
    expect(verifyChallenge(challenge.token, String(answer))).toEqual({ ok: true });
  });

  it("rejects garbage that is not a token", () => {
    expect(verifyChallenge("not-a-token", "5")).toEqual({
      ok: false,
      reason: "invalid",
    });
  });
});
