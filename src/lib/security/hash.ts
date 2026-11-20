import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";

/**
 * IP handling. We never store a raw IP address.
 *
 * The hash is salted with IP_HASH_SALT plus a date bucket, so:
 *  - the same visitor on the same day hashes to the same value (enough for
 *    rate limiting and dedupe within a day),
 *  - the value cannot be reversed or correlated across days,
 *  - a leaked database does not expose visitors' IPs.
 */

export function hashIp(ip: string | null | undefined, date = new Date()): string | null {
  if (!ip) return null;
  const day = date.toISOString().slice(0, 10);
  return createHmac("sha256", env().IP_HASH_SALT)
    .update(`${ip}|${day}`)
    .digest("hex");
}

/** Stable hash for a message body, used to detect repeated spam. */
export function hashMessage(message: string): string {
  return createHash("sha256").update(message.trim().toLowerCase()).digest("hex");
}

/** Constant-time string comparison for tokens. */
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/** Cryptographically random URL-safe token. */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

/** SHA-256 hex digest — used to store session/token hashes. */
export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
