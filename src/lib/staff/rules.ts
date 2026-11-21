/**
 * Staff account rules — pure logic, no I/O.
 *
 * MVP.md §8.4. These are the decisions that must be identical in the UI and in
 * the Server Action, so they live in one place and are unit-tested.
 *
 * The rule that matters most: **the owner cannot be demoted, deactivated or
 * deleted by anyone else.** Without it, an admin account that is compromised
 * can take the site from its owner permanently. The owner may still change
 * their own details — the guard is against *others*, not against themselves.
 */

import type { RoleName } from "@/lib/role-hierarchy";

export type StaffTarget = {
  id: number;
  role: RoleName;
  isActive: boolean;
};

export type StaffActor = {
  id: number;
  role: RoleName;
};

export type StaffAction =
  | "change_role"
  | "deactivate"
  | "delete"
  | "force_password_reset"
  | "revoke_sessions";

export type StaffCheck = { allowed: true } | { allowed: false; reason: string };

const ALLOWED: StaffCheck = { allowed: true };

function deny(reason: string): StaffCheck {
  return { allowed: false, reason };
}

/**
 * Can this actor perform this action on this account?
 *
 * Order of checks is deliberate: identity first (you may always act on
 * yourself), then the owner guard, then the role hierarchy.
 */
export function canManageStaff(
  actor: StaffActor,
  target: StaffTarget,
  action: StaffAction,
): StaffCheck {
  // Staff management is an admin-and-above capability. The page guard enforces
  // this too, but the action must not depend on the page having run: an editor
  // must never be able to manage accounts by posting the form directly.
  if (actor.role !== "owner" && actor.role !== "admin") {
    return deny("Only an owner or admin can manage staff accounts.");
  }

  // Nobody can delete their own account through this screen. Deleting the last
  // owner would leave the site unmanageable, and self-deletion is a mistake
  // more often than an intention.
  if (action === "delete" && actor.id === target.id) {
    return deny("You cannot delete your own account.");
  }

  // The owner is protected from everyone else, on every action.
  if (target.role === "owner" && actor.id !== target.id) {
    return deny("The owner account can only be changed by the owner.");
  }

  // An actor may not act on someone at or above their own rank, unless it is
  // themselves. This stops an admin from demoting another admin.
  const rank: Record<RoleName, number> = { support: 1, editor: 2, admin: 3, owner: 4 };
  if (actor.id !== target.id && rank[actor.role] <= rank[target.role]) {
    return deny("You cannot manage an account at or above your own role.");
  }

  // Only the owner may create or promote another owner.
  if (action === "change_role") {
    // The role being assigned is validated separately; this only guards the
    // actor's authority to touch the account at all.
    if (target.role === "owner" && actor.role !== "owner") {
      return deny("Only the owner can change an owner account.");
    }
  }

  return ALLOWED;
}

/**
 * Can this actor assign this role?
 *
 * Nobody may assign a role above their own. An admin can create editors and
 * support accounts; only the owner can create another owner.
 */
export function canAssignRole(actor: StaffActor, role: RoleName): StaffCheck {
  const rank: Record<RoleName, number> = { support: 1, editor: 2, admin: 3, owner: 4 };
  if (rank[role] > rank[actor.role]) {
    return deny(`You cannot assign the ${role} role.`);
  }
  return ALLOWED;
}

/** Roles an actor may choose from, for the form's dropdown. */
export function assignableRoles(actor: StaffActor): RoleName[] {
  const all: RoleName[] = ["support", "editor", "admin", "owner"];
  const rank: Record<RoleName, number> = { support: 1, editor: 2, admin: 3, owner: 4 };
  return all.filter((role) => rank[role] <= rank[actor.role]);
}

/**
 * Would this change leave the site with no active owner?
 *
 * Checked before a demotion or deactivation is applied. A site with no active
 * owner cannot be administered at all, so this is a hard stop rather than a
 * warning.
 */
export function wouldRemoveLastOwner(
  target: StaffTarget,
  next: { role?: RoleName; isActive?: boolean },
  activeOwnerCount: number,
): boolean {
  const wasActiveOwner = target.role === "owner" && target.isActive;
  if (!wasActiveOwner) return false;

  const willBeOwner = (next.role ?? target.role) === "owner";
  const willBeActive = next.isActive ?? target.isActive;

  // Still an active owner after the change: nothing is lost.
  if (willBeOwner && willBeActive) return false;

  return activeOwnerCount <= 1;
}

/** Human-readable summary of a role change, for the activity log. */
export function describeRoleChange(from: RoleName, to: RoleName): string {
  return from === to ? `role unchanged (${to})` : `role ${from} → ${to}`;
}
