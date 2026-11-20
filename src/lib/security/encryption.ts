import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "node:crypto";
import { env } from "@/lib/env";

/**
 * Symmetric encryption for secrets that must be recoverable: TOTP secrets and
 * any stored third-party tokens.
 *
 * AES-256-GCM with a random 12-byte IV per value. Output format:
 *   v1.<iv-b64url>.<authTag-b64url>.<ciphertext-b64url>
 *
 * The version prefix lets us rotate the scheme later without guessing at
 * what an old ciphertext is.
 *
 * The key is derived from ENCRYPTION_KEY with scrypt, so a passphrase-style
 * value still produces a proper 32-byte key.
 */

const VERSION = "v1";
const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12;
const KEY_BYTES = 32;

function deriveKey(): Buffer {
  // Salt is fixed per deployment: ENCRYPTION_KEY itself is the secret, and a
  // random salt would have to be stored alongside every ciphertext.
  return scryptSync(env().ENCRYPTION_KEY, "junaedhossain-encryption-v1", KEY_BYTES);
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, deriveKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    VERSION,
    iv.toString("base64url"),
    authTag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

export function decryptSecret(payload: string): string {
  const parts = payload.split(".");
  if (parts.length !== 4 || parts[0] !== VERSION) {
    throw new Error("Unrecognised encrypted value format");
  }

  const [, ivPart, tagPart, dataPart] = parts;
  const decipher = createDecipheriv(
    ALGORITHM,
    deriveKey(),
    Buffer.from(ivPart, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagPart, "base64url"));

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(dataPart, "base64url")),
    decipher.final(),
  ]);

  return plaintext.toString("utf8");
}
