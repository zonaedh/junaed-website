import { and, eq, gt, lt } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/db";
import { sessions, users, type UserRole } from "@/db/schema";
import { randomToken, sha256 } from "@/lib/security/hash";

/**
 * Session management (MVP.md §2, D-005).
 *
 * Design:
 *  - The cookie holds a random 32-byte token. The database stores only its
 *    SHA-256 hash, so a database leak does not yield usable sessions.
 *  - Cookie flags: httpOnly, Secure (in production), SameSite=Strict, path=/.
 *  - 7-day sliding expiry: any request past the halfway mark extends it.
 *  - Logout-all-devices is a delete by user_id.
 *
 * The cookie name is host-scoped by the browser, so the public site and the
 * admin host do not share a session. That is intentional: the public site
 * needs no session at all.
 */

export const SESSION_COOKIE = "jh_session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const SLIDING_THRESHOLD_MS = SESSION_TTL_MS / 2;

export type SessionUser = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  totpEnabled: boolean;
};

export type CreatedSession = {
  token: string;
  expiresAt: Date;
};

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/** Create a session row and return the raw token for the cookie. */
export async function createSession(
  userId: number,
  meta: { ipHash?: string | null; userAgent?: string | null } = {},
): Promise<CreatedSession> {
  const token = randomToken(32);
  const id = randomToken(16);
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await db.insert(sessions).values({
    id,
    userId,
    tokenHash: sha256(token),
    ipHash: meta.ipHash ?? null,
    userAgent: meta.userAgent?.slice(0, 500) ?? null,
    expiresAt,
  });

  return { token, expiresAt };
}

/** Write the session cookie. Must be called from a Server Action or Route Handler. */
export async function setSessionCookie(session: CreatedSession): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, session.token, {
    httpOnly: true,
    secure: isProduction(),
    sameSite: "strict",
    path: "/",
    expires: session.expiresAt,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/**
 * Resolve the current session from the cookie.
 * Returns null when there is no cookie, the session is expired, or the user
 * has been deactivated. Also performs the sliding-expiry extension.
 */
export async function getSession(): Promise<{
  user: SessionUser;
  sessionId: string;
} | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const tokenHash = sha256(token);

  const rows = await db
    .select({
      sessionId: sessions.id,
      expiresAt: sessions.expiresAt,
      userId: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      isActive: users.isActive,
      totpSecret: users.totpSecret,
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, new Date())))
    .limit(1);

  const row = rows[0];
  if (!row || !row.isActive) return null;

  // Sliding expiry: extend once we are past the halfway point.
  const remaining = row.expiresAt.getTime() - Date.now();
  if (remaining < SLIDING_THRESHOLD_MS) {
    const nextExpiry = new Date(Date.now() + SESSION_TTL_MS);
    await db
      .update(sessions)
      .set({ expiresAt: nextExpiry })
      .where(eq(sessions.id, row.sessionId));
  }

  return {
    sessionId: row.sessionId,
    user: {
      id: row.userId,
      name: row.name,
      email: row.email,
      role: row.role,
      totpEnabled: Boolean(row.totpSecret),
    },
  };
}

/** Revoke one session (logout). */
export async function revokeSession(sessionId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, sessionId));
}

/** Revoke every session for a user (logout everywhere / password change). */
export async function revokeAllSessions(userId: number): Promise<void> {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

/** Housekeeping: drop expired rows. Safe to call from a cron or on login. */
export async function purgeExpiredSessions(): Promise<void> {
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
}
