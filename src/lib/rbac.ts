import { redirect } from "next/navigation";
import { getSession, type SessionUser } from "@/lib/auth/session";
import { getAdminBase } from "@/lib/admin-path";
import {
  hasRole,
  isTwoFactorMandatory,
  ROLE_LABELS,
  type RoleName,
} from "@/lib/role-hierarchy";

/**
 * Role-based access control (MVP.md §4).
 *
 * Every admin mutation must call `requireRole()`. Hiding UI is not access
 * control — these checks run on the server, in the action or page itself.
 *
 * The hierarchy and labels live in role-hierarchy.ts (pure, testable). This
 * file adds the request-time guards.
 *
 * Redirects are host-aware (D-023, D-024): on the admin host the clean path
 * works because the proxy rewrites it; on loopback the panel lives under
 * `/admin`, and a bare `/login` would 404.
 */

export { hasRole, isTwoFactorMandatory, ROLE_LABELS };
export type { RoleName };

export class UnauthorizedError extends Error {
  constructor(message = "You do not have permission to do that.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

/**
 * For pages: redirects to the login screen when unauthenticated, and to the
 * dashboard with a forbidden notice when the role is insufficient.
 */
export async function requireRole(required: RoleName): Promise<SessionUser> {
  const session = await getSession();
  const base = await getAdminBase();

  if (!session) {
    redirect(`${base}/login`);
  }

  if (!hasRole(session.user.role, required)) {
    redirect(`${base}/dashboard?error=forbidden`);
  }

  return session.user;
}

/**
 * For Server Actions: throws instead of redirecting, so the action can return
 * a structured error to the form rather than navigating away mid-submit.
 */
export async function requireRoleOrThrow(required: RoleName): Promise<SessionUser> {
  const session = await getSession();

  if (!session) {
    throw new UnauthorizedError("Your session has expired. Please sign in again.");
  }

  if (!hasRole(session.user.role, required)) {
    throw new UnauthorizedError();
  }

  return session.user;
}

/** Owner-only guard for destructive and security-sensitive operations. */
export async function requireOwner(): Promise<SessionUser> {
  return requireRole("owner");
}
