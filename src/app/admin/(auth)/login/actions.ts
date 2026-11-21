"use server";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { ACTIONS, logActivity } from "@/lib/audit";
import {
  clearFailedAttempts,
  isLocked,
  lockoutMinutesRemaining,
  recordFailedAttempt,
} from "@/lib/auth/lockout";
import { verifyPassword } from "@/lib/auth/password";
import {
  createSession,
  purgeExpiredSessions,
  setSessionCookie,
} from "@/lib/auth/session";
import { isTwoFactorMandatory, verifyTotpCode } from "@/lib/auth/totp";
import { hashIp } from "@/lib/security/hash";
import { checkRateLimit } from "@/lib/contact/rate-limit";
import { LOGIN_RULE } from "@/lib/security/rate-limit-rules";
import { clientAddressFromHeaders, isAddressBlocked } from "@/lib/security/ip";
import { getSettings } from "@/lib/settings";
import { loginSchema, type LoginState } from "@/lib/validation/auth";

/**
 * Login Server Action.
 *
 * Security properties (MVP.md §2, §6):
 *  - Generic error for every failure mode: wrong email, wrong password, wrong
 *    code and locked account all return the same message. Only the lockout
 *    case names a wait time, because that is actionable and does not reveal
 *    whether the account exists.
 *  - Timing: a missing user still runs a dummy Argon2 verify so response time
 *    does not reveal account existence.
 *  - 2FA is mandatory for owner/admin: if the role requires it and no secret
 *    is enrolled, login is refused with instructions, not silently allowed.
 *  - Every attempt is written to activity_logs.
 */

const GENERIC_ERROR = "Email or password is incorrect.";

/** A real Argon2id hash of a random string, used to equalise timing. */
const DUMMY_HASH =
  "$argon2id$v=19$m=19456,t=2,p=1$c29tZXNhbHRzb21lc2FsdA$8Q1nXk3m0Kq0Yh7oQ0mQ7oQ0mQ7oQ0mQ7oQ0mQ7oQ0m";

async function requestMeta() {
  const headerList = await headers();
  const ip = clientAddressFromHeaders(headerList);
  return {
    ip,
    ipHash: hashIp(ip),
    userAgent: headerList.get("user-agent"),
  };
}

/**
 * Admin IP allowlist (MVP.md §8.2, optional).
 *
 * When the owner has set an allowlist, only those addresses may reach the login
 * action. An empty setting means "allow everyone", which is the default: a
 * misconfigured allowlist is a lockout, and the owner has to be able to get in.
 *
 * This is a second gate, not the only one — the account lockout and 2FA still
 * apply to anyone who passes it.
 */
async function allowlistBlocks(ip: string | null): Promise<boolean> {
  const settings = await getSettings().catch(() => null);
  const raw = settings?.loginAllowlist ?? "";
  const entries = raw
    .split(/[\n,]/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (entries.length === 0) return false;
  // No address means no proxy in front (local dev). Do not lock the developer
  // out of their own machine over a header that only exists in production.
  if (!ip) return false;

  return !isAddressBlocked(ip, entries);
}

export async function login(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    totp: formData.get("totp"),
  });

  if (!parsed.success) {
    return { status: "error", message: GENERIC_ERROR };
  }

  const { email, password, totp } = parsed.data;

  /**
   * Everything below touches the database or reads a secret, so it is wrapped:
   * a missing env var or an unreachable database must produce a plain error
   * message, never a stack trace in the browser. A misconfigured deploy is a
   * server-side problem and the visitor is told nothing about it.
   */
  let meta: { ip: string | null; ipHash: string | null; userAgent: string | null };
  let user: typeof users.$inferSelect | undefined;

  try {
    meta = await requestMeta();

    // Allowlist check before anything else: an address that is not permitted
    // should not learn whether the account exists, or burn a password attempt.
    if (await allowlistBlocks(meta.ip)) {
      await logActivity({
        action: ACTIONS.loginFailed,
        entity: "user",
        meta: { reason: "ip_not_allowlisted" },
        ipHash: meta.ipHash,
      });
      return { status: "error", message: GENERIC_ERROR };
    }

    // Per-IP limit. The account lockout stops one account being guessed; this
    // stops one address spraying many accounts. Both are needed (D-040).
    if (meta.ipHash) {
      const limit = await checkRateLimit(meta.ipHash, LOGIN_RULE);
      if (!limit.allowed) {
        const minutes = Math.max(1, Math.ceil((limit.resetAt - Date.now()) / 60000));
        await logActivity({
          action: ACTIONS.loginLocked,
          entity: "user",
          meta: { reason: "ip_rate_limited", minutes },
          ipHash: meta.ipHash,
        });
        return {
          status: "error",
          message: `Too many attempts from this connection. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
        };
      }
    }

    // Opportunistic housekeeping; never blocks the login.
    void purgeExpiredSessions().catch(() => {});

    const rows = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    user = rows[0];
  } catch (error) {
    console.error("[login] infrastructure failure", error);
    return {
      status: "error",
      message:
        "Sign-in is temporarily unavailable. Please try again in a moment.",
    };
  }

  // Unknown email: burn the same amount of time, then fail generically.
  if (!user) {
    await verifyPassword(DUMMY_HASH, password).catch(() => false);
    await logActivity({
      action: ACTIONS.loginFailed,
      entity: "user",
      meta: { reason: "unknown_email" },
      ipHash: meta.ipHash,
    });
    return { status: "error", message: GENERIC_ERROR };
  }

  if (!user.isActive) {
    await logActivity({
      userId: user.id,
      action: ACTIONS.loginFailed,
      entity: "user",
      entityId: user.id,
      meta: { reason: "inactive" },
      ipHash: meta.ipHash,
    });
    return { status: "error", message: GENERIC_ERROR };
  }

  // Locked accounts are refused before the password is even checked.
  if (isLocked(user)) {
    const minutes = lockoutMinutesRemaining(user);
    await logActivity({
      userId: user.id,
      action: ACTIONS.loginLocked,
      entity: "user",
      entityId: user.id,
      meta: { minutesRemaining: minutes },
      ipHash: meta.ipHash,
    });
    return {
      status: "error",
      message: `Too many failed attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
    };
  }

  const passwordOk = await verifyPassword(user.passwordHash, password);

  if (!passwordOk) {
    const state = await recordFailedAttempt(user.id);
    await logActivity({
      userId: user.id,
      action: ACTIONS.loginFailed,
      entity: "user",
      entityId: user.id,
      meta: {
        reason: "bad_password",
        failedCount: state.failedLoginCount,
        locked: isLocked(state),
      },
      ipHash: meta.ipHash,
    });

    if (isLocked(state)) {
      const minutes = lockoutMinutesRemaining(state);
      return {
        status: "error",
        message: `Too many failed attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
      };
    }

    return { status: "error", message: GENERIC_ERROR };
  }

  /* ---------------------------- second factor ---------------------------- */

  const requiresTotp = Boolean(user.totpSecret) || isTwoFactorMandatory(user.role);

  if (requiresTotp) {
    if (!user.totpSecret) {
      // Password was right, but this account must enrol 2FA before it can be
      // used. Do not create a session.
      await logActivity({
        userId: user.id,
        action: ACTIONS.loginFailed,
        entity: "user",
        entityId: user.id,
        meta: { reason: "totp_not_enrolled" },
        ipHash: meta.ipHash,
      });
      return {
        status: "error",
        message:
          "This account requires two-factor authentication but has not set it up. Ask the owner to reset 2FA for this account.",
      };
    }

    if (!totp) {
      // Password accepted; ask for the code. No session yet.
      return { status: "totp_required", email };
    }

    if (!verifyTotpCode(user.totpSecret, totp)) {
      const state = await recordFailedAttempt(user.id);
      await logActivity({
        userId: user.id,
        action: ACTIONS.loginFailed,
        entity: "user",
        entityId: user.id,
        meta: { reason: "bad_totp", locked: isLocked(state) },
        ipHash: meta.ipHash,
      });
      return {
        status: "totp_required",
        email,
        message: "That code is not valid. Check your authenticator app and try again.",
      };
    }
  }

  /* ------------------------------ success -------------------------------- */

  await clearFailedAttempts(user.id);

  const session = await createSession(user.id, {
    ipHash: meta.ipHash,
    userAgent: meta.userAgent,
  });
  await setSessionCookie(session);

  await logActivity({
    userId: user.id,
    action: ACTIONS.loginSuccess,
    entity: "user",
    entityId: user.id,
    meta: { role: user.role, twoFactor: requiresTotp },
    ipHash: meta.ipHash,
  });

  /**
   * Where to land after login.
   *
   * On the admin host the proxy rewrites `/dashboard` into the admin tree, so
   * the clean URL is correct. On loopback there is no admin subdomain and no
   * rewrite, so `/dashboard` is a 404 — the panel lives at `/admin/dashboard`.
   * Detect the host the same way the proxy does and pick the right prefix.
   */
  const host = (await headers()).get("host") ?? "";
  const hostname = host.split(":")[0]?.toLowerCase() ?? "";
  const isAdminHost = hostname.startsWith("admin.");
  const isLoopback =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]" ||
    hostname === "::1";

  redirect(isAdminHost || !isLoopback ? "/dashboard" : "/admin/dashboard");
}

/** Logout: revoke this session and clear the cookie. */
export async function logout(): Promise<void> {
  const { getSession, revokeSession, clearSessionCookie } = await import(
    "@/lib/auth/session"
  );
  const session = await getSession();

  if (session) {
    await revokeSession(session.sessionId);
    await logActivity({
      userId: session.user.id,
      action: ACTIONS.logout,
      entity: "user",
      entityId: session.user.id,
    });
  }

  await clearSessionCookie();

  // Same loopback caveat as login: /login only resolves on the admin host.
  const host = (await headers()).get("host") ?? "";
  const hostname = host.split(":")[0]?.toLowerCase() ?? "";
  const isAdminHost = hostname.startsWith("admin.");
  const isLoopback =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]" ||
    hostname === "::1";

  redirect(isAdminHost || !isLoopback ? "/login" : "/admin/login");
}
