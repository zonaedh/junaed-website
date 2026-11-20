/**
 * Math captcha — challenge generation and signed-token verification.
 *
 * SERVER ONLY (uses node:crypto). Never import from a `"use client"` file.
 *
 * Why a signed token rather than a session or a database row: the answer must
 * not be recoverable by the client. The token carries the answer and the issue
 * time, signed with HMAC-SHA256, so the server can verify it without storing
 * anything and the client cannot read or forge it. A database row would work
 * too, but it would need cleanup and would make a bot's failed attempt a
 * write.
 *
 * The token is deliberately short-lived (10 minutes) and single-purpose: the
 * HMAC covers the purpose string, so a captcha token can never be replayed as
 * something else.
 */

import { createHmac, randomInt, timingSafeEqual } from "node:crypto";

export const CAPTCHA_TTL_MS = 10 * 60 * 1000;

/** Purpose string, mixed into the HMAC so tokens are not interchangeable. */
const PURPOSE = "contact-captcha-v1";

export type Challenge = {
  /** Human-readable question, e.g. "What is 7 + 4?" */
  question: string;
  /** Signed token carrying the answer. Safe to put in a hidden field. */
  token: string;
};

type TokenPayload = {
  /** The correct answer. */
  a: number;
  /** Issued-at, epoch ms. */
  t: number;
};

function secret(): string {
  const value = process.env.CAPTCHA_SECRET;
  if (!value) {
    throw new Error(
      "CAPTCHA_SECRET is not set. Generate one with `openssl rand -hex 32` " +
        "and add it to .env.local.",
    );
  }
  return value;
}

function sign(payload: string): string {
  return createHmac("sha256", secret())
    .update(`${PURPOSE}:${payload}`)
    .digest("base64url");
}

function encode(payload: TokenPayload): string {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${body}.${sign(body)}`;
}

function decode(token: string): TokenPayload | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, signature] = parts;
  if (!body || !signature) return null;

  // Constant-time compare. Lengths must match before timingSafeEqual, which
  // throws on a length mismatch rather than returning false.
  const expected = sign(body);
  const given = Buffer.from(signature);
  const wanted = Buffer.from(expected);
  if (given.length !== wanted.length) return null;
  if (!timingSafeEqual(given, wanted)) return null;

  try {
    const parsed = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as TokenPayload;
    if (typeof parsed.a !== "number" || typeof parsed.t !== "number") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Build a fresh challenge.
 *
 * Operands stay small and the result is never negative, because a captcha that
 * makes a visitor stop and think has already cost more than the spam it stops.
 * Subtraction is only offered when the left operand is larger.
 */
export function createChallenge(now = Date.now()): Challenge {
  const useSubtraction = randomInt(0, 2) === 1;
  let left = randomInt(2, 10);
  let right = randomInt(1, 10);

  let answer: number;
  let operator: string;

  if (useSubtraction) {
    if (right > left) [left, right] = [right, left];
    answer = left - right;
    operator = "−";
  } else {
    answer = left + right;
    operator = "+";
  }

  return {
    question: `What is ${left} ${operator} ${right}?`,
    token: encode({ a: answer, t: now }),
  };
}

export type CaptchaResult =
  | { ok: true }
  | { ok: false; reason: "missing" | "invalid" | "expired" | "wrong" };

/**
 * Verify an answer against a token.
 *
 * Returns a reason so the caller can decide what to tell the visitor. A wrong
 * answer and a forged token are deliberately not distinguished in the UI, but
 * they are here, because the logs should be honest.
 */
export function verifyChallenge(
  token: unknown,
  answer: unknown,
  now = Date.now(),
): CaptchaResult {
  if (typeof token !== "string" || token === "") {
    return { ok: false, reason: "missing" };
  }
  if (typeof answer !== "string" && typeof answer !== "number") {
    return { ok: false, reason: "missing" };
  }

  const payload = decode(token);
  if (!payload) return { ok: false, reason: "invalid" };

  if (now - payload.t > CAPTCHA_TTL_MS) return { ok: false, reason: "expired" };

  const given = Number(String(answer).trim());
  if (!Number.isFinite(given)) return { ok: false, reason: "wrong" };
  if (given !== payload.a) return { ok: false, reason: "wrong" };

  return { ok: true };
}
