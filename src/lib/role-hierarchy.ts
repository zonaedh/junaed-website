/**
 * Role hierarchy — pure logic, no database or Next.js imports.
 *
 * Split out from rbac.ts so the ordering can be unit-tested without pulling
 * in the database client. rbac.ts re-exports these and adds the request-time
 * guards (requireRole, requireRoleOrThrow).
 */

export type RoleName = "support" | "editor" | "admin" | "owner";

const ROLE_RANK: Record<RoleName, number> = {
  support: 1,
  editor: 2,
  admin: 3,
  owner: 4,
};

/** "At least" semantics: requireRole("editor") admits editor, admin, owner. */
export function hasRole(userRole: RoleName, required: RoleName): boolean {
  return ROLE_RANK[userRole] >= ROLE_RANK[required];
}

export const ROLE_LABELS: Record<RoleName, string> = {
  owner: "Owner",
  admin: "Admin",
  editor: "Editor",
  support: "Support",
};

/** Roles for which 2FA is not optional. */
export function isTwoFactorMandatory(role: string): boolean {
  return role === "owner" || role === "admin";
}
