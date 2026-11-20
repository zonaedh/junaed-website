import { generateSecret, generateURI, verifySync } from "otplib";
import { randomBytes } from "node:crypto";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { decryptSecret, encryptSecret } from "@/lib/security/encryption";

/**
 * TOTP two-factor authentication (MVP.md §2).
 *
 * Uses otplib v13's functional API (v13 removed the `authenticator` object).
 *   - 6 digits, 30-second period (Google Authenticator compatible)
 *   - ±30 seconds of clock drift tolerance
 *   - secrets encrypted with AES-256-GCM before they touch the database
 *   - 10 single-use recovery codes stored as Argon2id hashes
 *
 * 2FA is mandatory for owner and admin; that rule is enforced in the login
 * action, not here.
 */

const TOTP_DIGITS = 6;
const TOTP_PERIOD = 30;
/** One step either side, in seconds. */
const TOTP_TOLERANCE = 30;

export const TOTP_ISSUER = "Junaed Hossain Admin";
const RECOVERY_CODE_COUNT = 10;

export type TotpEnrolment = {
  /** Base32 secret. Show once, never store in plaintext. */
  secret: string;
  /** otpauth:// URI to render as a QR code. */
  otpauthUrl: string;
  /** Encrypted form to persist. */
  encryptedSecret: string;
};

export function createTotpEnrolment(email: string): TotpEnrolment {
  const secret = generateSecret(); // 20 bytes / 160 bits by default
  const otpauthUrl = generateURI({
    strategy: "totp",
    issuer: TOTP_ISSUER,
    label: email,
    secret,
    digits: TOTP_DIGITS,
    period: TOTP_PERIOD,
  });

  return {
    secret,
    otpauthUrl,
    encryptedSecret: encryptSecret(secret),
  };
}

/** Rebuild the otpauth URI from a stored (encrypted) secret. */
export function otpauthUrlFor(email: string, encryptedSecret: string): string {
  return generateURI({
    strategy: "totp",
    issuer: TOTP_ISSUER,
    label: email,
    secret: decryptSecret(encryptedSecret),
    digits: TOTP_DIGITS,
    period: TOTP_PERIOD,
  });
}

/**
 * Verify a 6-digit code against an encrypted secret.
 * Returns false on any error — a malformed secret must not throw into the
 * login route.
 */
export function verifyTotpCode(encryptedSecret: string, code: string): boolean {
  const normalised = code.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(normalised)) return false;

  try {
    const secret = decryptSecret(encryptedSecret);
    const result = verifySync({
      secret,
      token: normalised,
      digits: TOTP_DIGITS,
      period: TOTP_PERIOD,
      epochTolerance: TOTP_TOLERANCE,
    });

    // v13 returns a result object rather than a bare boolean.
    if (typeof result === "boolean") return result;
    return Boolean(result?.valid);
  } catch {
    return false;
  }
}

/* ------------------------------ recovery codes ----------------------------- */

export type RecoveryCodes = {
  /** Plaintext codes to show the user exactly once. */
  plain: string[];
  /** Argon2id hashes to persist. */
  hashed: string[];
};

function formatCode(): string {
  // 10 hex characters, grouped for readability: a1b2c-3d4e5
  const raw = randomBytes(5).toString("hex");
  return `${raw.slice(0, 5)}-${raw.slice(5, 10)}`;
}

export async function generateRecoveryCodes(): Promise<RecoveryCodes> {
  const plain = Array.from({ length: RECOVERY_CODE_COUNT }, formatCode);
  const hashed = await Promise.all(plain.map((code) => hashPassword(code)));
  return { plain, hashed };
}

/**
 * Check a recovery code and return the remaining hashes with the used one
 * removed. Returns null when the code does not match any stored hash.
 *
 * The caller must persist `remaining` — that is what makes the code
 * single-use.
 */
export async function consumeRecoveryCode(
  code: string,
  storedHashes: string[] | null | undefined,
): Promise<{ remaining: string[] } | null> {
  if (!storedHashes?.length) return null;

  const normalised = code.trim().toLowerCase();

  for (let index = 0; index < storedHashes.length; index += 1) {
    const matches = await verifyPassword(storedHashes[index], normalised);
    if (matches) {
      return {
        remaining: storedHashes.filter((_, i) => i !== index),
      };
    }
  }

  return null;
}

/** Roles for which 2FA is not optional. */
export function isTwoFactorMandatory(role: string): boolean {
  return role === "owner" || role === "admin";
}
