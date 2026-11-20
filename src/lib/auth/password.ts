import { hash, verify } from "@node-rs/argon2";

/**
 * Password hashing with Argon2id (MVP.md §2, DECISIONS D-005).
 *
 * Parameters follow the OWASP 2024 recommendation for Argon2id:
 *   m = 19456 KiB (19 MiB), t = 2, p = 1
 * These are the library defaults for `Algorithm.Argon2id`, but they are set
 * explicitly so a library upgrade cannot silently weaken them.
 */

const ARGON2_OPTIONS = {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;

export async function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON2_OPTIONS);
}

/**
 * Verify a password against a stored hash.
 * Returns false rather than throwing on a malformed hash, so a corrupted row
 * cannot crash the login route.
 */
export async function verifyPassword(
  storedHash: string,
  password: string,
): Promise<boolean> {
  try {
    return await verify(storedHash, password, ARGON2_OPTIONS);
  } catch {
    return false;
  }
}

/**
 * Minimum password policy. Deliberately length-based rather than
 * character-class-based: length is what actually resists guessing, and
 * complexity rules push people toward `Password1!`.
 */
export const PASSWORD_MIN_LENGTH = 12;

export function validatePasswordStrength(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`;
  }
  if (password.length > 200) {
    return "Password must be under 200 characters.";
  }
  // Reject the handful of passwords that show up in every breach list.
  const common = [
    "password",
    "123456",
    "qwerty",
    "letmein",
    "admin",
    "welcome",
    "iloveyou",
  ];
  const lower = password.toLowerCase();
  if (common.some((word) => lower.includes(word))) {
    return "That password is too common. Please choose another.";
  }
  return null;
}
