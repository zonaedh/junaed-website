"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { ACTIONS, logActivity } from "@/lib/audit";
import { requireRoleOrThrow } from "@/lib/rbac";
import { hashPassword, validatePasswordStrength } from "@/lib/auth/password";
import { hashIp } from "@/lib/security/hash";
import { clientAddressFromHeaders } from "@/lib/security/ip";
import { revokeAllSessions } from "@/lib/auth/session";
import type { RoleName } from "@/lib/role-hierarchy";
import {
  canAssignRole,
  canManageStaff,
  describeRoleChange,
  wouldRemoveLastOwner,
} from "@/lib/staff/rules";
import {
  countActiveOwners,
  countSessions,
  createStaff,
  deleteStaff,
  emailTaken,
  getStaff,
  resetStaffTotp,
  setStaffActive,
  setStaffPassword,
  updateStaffRole,
} from "@/lib/staff/repository";

/**
 * Staff management actions (MVP.md §8.4).
 *
 * Every action follows the same shape:
 *  1. authenticate the actor (admin or above),
 *  2. load the target,
 *  3. ask `rules.ts` whether this is allowed,
 *  4. apply, log, revalidate.
 *
 * The permission checks are called here rather than trusted from the page: a
 * form post can arrive from anywhere, and hiding a button is not access
 * control.
 */

export type StaffState = { status: "idle" | "success" | "error"; message?: string };

const ROLES: readonly RoleName[] = ["support", "editor", "admin", "owner"];

async function actorIpHash(): Promise<string | null> {
  const headerList = await headers();
  return hashIp(clientAddressFromHeaders(headerList));
}

/* ------------------------------- create ---------------------------------- */

export async function addStaff(
  _prev: StaffState,
  formData: FormData,
): Promise<StaffState> {
  const actor = await requireRoleOrThrow("admin");

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "editor") as RoleName;
  const password = String(formData.get("password") ?? "");

  if (name === "") return { status: "error", message: "Enter a name." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { status: "error", message: "That email address is not valid." };
  }
  if (!ROLES.includes(role)) {
    return { status: "error", message: "Choose a valid role." };
  }

  const roleCheck = canAssignRole(actor, role);
  if (!roleCheck.allowed) {
    return { status: "error", message: roleCheck.reason };
  }

  const strength = validatePasswordStrength(password);
  if (strength) return { status: "error", message: strength };

  if (await emailTaken(email)) {
    return { status: "error", message: "An account with that email already exists." };
  }

  const passwordHash = await hashPassword(password);
  const created = await createStaff({ name, email, passwordHash, role });

  await logActivity({
    userId: actor.id,
    action: ACTIONS.staffInvited,
    entity: "user",
    entityId: created.id,
    meta: { email, role, method: "password_set_by_admin" },
    ipHash: await actorIpHash(),
  });

  revalidatePath("/admin/staff");
  return {
    status: "success",
    message: `${name} can now sign in. Share the password with them over a channel you trust, and ask them to change it.`,
  };
}

/* ----------------------------- change role -------------------------------- */

export async function changeRole(
  _prev: StaffState,
  formData: FormData,
): Promise<StaffState> {
  const actor = await requireRoleOrThrow("admin");

  const id = Number(formData.get("id"));
  const role = String(formData.get("role") ?? "") as RoleName;

  if (!Number.isFinite(id) || !ROLES.includes(role)) {
    return { status: "error", message: "That change is not valid." };
  }

  const target = await getStaff(id);
  if (!target) return { status: "error", message: "That account no longer exists." };

  const check = canManageStaff(actor, target, "change_role");
  if (!check.allowed) return { status: "error", message: check.reason };

  const assign = canAssignRole(actor, role);
  if (!assign.allowed) return { status: "error", message: assign.reason };

  if (target.role === role) {
    return { status: "success", message: "No change." };
  }

  // Demoting the last active owner would leave the site unadministrable.
  if (wouldRemoveLastOwner(target, { role }, await countActiveOwners())) {
    return {
      status: "error",
      message: "That would leave no active owner. Promote someone else first.",
    };
  }

  await updateStaffRole(id, role);

  await logActivity({
    userId: actor.id,
    action: ACTIONS.staffRoleChanged,
    entity: "user",
    entityId: id,
    meta: { email: target.email, change: describeRoleChange(target.role, role) },
    ipHash: await actorIpHash(),
  });

  revalidatePath("/admin/staff");
  return { status: "success", message: `${target.name}: ${describeRoleChange(target.role, role)}.` };
}

/* --------------------------- activate / deactivate ------------------------ */

export async function toggleActive(
  _prev: StaffState,
  formData: FormData,
): Promise<StaffState> {
  const actor = await requireRoleOrThrow("admin");

  const id = Number(formData.get("id"));
  const next = String(formData.get("isActive")) === "true";

  if (!Number.isFinite(id)) return { status: "error", message: "That change is not valid." };

  const target = await getStaff(id);
  if (!target) return { status: "error", message: "That account no longer exists." };

  const check = canManageStaff(actor, target, "deactivate");
  if (!check.allowed) return { status: "error", message: check.reason };

  if (wouldRemoveLastOwner(target, { isActive: next }, await countActiveOwners())) {
    return {
      status: "error",
      message: "That would leave no active owner. Promote someone else first.",
    };
  }

  await setStaffActive(id, next);

  await logActivity({
    userId: actor.id,
    action: next ? ACTIONS.staffActivated : ACTIONS.staffDeactivated,
    entity: "user",
    entityId: id,
    meta: { email: target.email, sessionsEnded: next ? 0 : target.sessionCount },
    ipHash: await actorIpHash(),
  });

  revalidatePath("/admin/staff");
  return {
    status: "success",
    message: next
      ? `${target.name} can sign in again.`
      : `${target.name} is deactivated and their sessions were ended.`,
  };
}

/* --------------------------- force password reset ------------------------- */

export async function forcePasswordReset(
  _prev: StaffState,
  formData: FormData,
): Promise<StaffState> {
  const actor = await requireRoleOrThrow("admin");

  const id = Number(formData.get("id"));
  const password = String(formData.get("password") ?? "");

  if (!Number.isFinite(id)) return { status: "error", message: "That change is not valid." };

  const target = await getStaff(id);
  if (!target) return { status: "error", message: "That account no longer exists." };

  const check = canManageStaff(actor, target, "force_password_reset");
  if (!check.allowed) return { status: "error", message: check.reason };

  const strength = validatePasswordStrength(password);
  if (strength) return { status: "error", message: strength };

  const passwordHash = await hashPassword(password);
  await setStaffPassword(id, passwordHash);

  // A new password must invalidate every existing session, or a stolen cookie
  // survives the reset that was meant to kill it.
  await revokeAllSessions(id);

  await logActivity({
    userId: actor.id,
    action: ACTIONS.staffPasswordResetForced,
    entity: "user",
    entityId: id,
    meta: { email: target.email, sessionsRevoked: true },
    ipHash: await actorIpHash(),
  });

  revalidatePath("/admin/staff");
  return {
    status: "success",
    message: `Password set for ${target.name}. Their existing sessions were ended.`,
  };
}

/* ----------------------------- revoke sessions ---------------------------- */

export async function revokeSessions(
  _prev: StaffState,
  formData: FormData,
): Promise<StaffState> {
  const actor = await requireRoleOrThrow("admin");

  const id = Number(formData.get("id"));
  if (!Number.isFinite(id)) return { status: "error", message: "That change is not valid." };

  const target = await getStaff(id);
  if (!target) return { status: "error", message: "That account no longer exists." };

  const check = canManageStaff(actor, target, "revoke_sessions");
  if (!check.allowed) return { status: "error", message: check.reason };

  const before = await countSessions(id);
  await revokeAllSessions(id);

  await logActivity({
    userId: actor.id,
    action: ACTIONS.staffSessionsRevoked,
    entity: "user",
    entityId: id,
    meta: { email: target.email, sessionsEnded: before },
    ipHash: await actorIpHash(),
  });

  revalidatePath("/admin/staff");
  return {
    status: "success",
    message: before === 0 ? "That account had no active sessions." : `Ended ${before} session${before === 1 ? "" : "s"}.`,
  };
}

/* -------------------------------- remove ---------------------------------- */

export async function removeStaff(
  _prev: StaffState,
  formData: FormData,
): Promise<StaffState> {
  const actor = await requireRoleOrThrow("admin");

  const id = Number(formData.get("id"));
  if (!Number.isFinite(id)) return { status: "error", message: "That change is not valid." };

  const target = await getStaff(id);
  if (!target) return { status: "error", message: "That account no longer exists." };

  const check = canManageStaff(actor, target, "delete");
  if (!check.allowed) return { status: "error", message: check.reason };

  if (wouldRemoveLastOwner(target, { isActive: false }, await countActiveOwners())) {
    return { status: "error", message: "That would leave no active owner." };
  }

  await deleteStaff(id);

  await logActivity({
    userId: actor.id,
    action: ACTIONS.staffUpdated,
    entity: "user",
    entityId: id,
    meta: { email: target.email, deleted: true, role: target.role },
    ipHash: await actorIpHash(),
  });

  revalidatePath("/admin/staff");
  return { status: "success", message: `${target.name} was removed.` };
}

/* ------------------------------- reset 2FA -------------------------------- */

export async function resetTotp(
  _prev: StaffState,
  formData: FormData,
): Promise<StaffState> {
  const actor = await requireRoleOrThrow("owner");

  const id = Number(formData.get("id"));
  if (!Number.isFinite(id)) return { status: "error", message: "That change is not valid." };

  const target = await getStaff(id);
  if (!target) return { status: "error", message: "That account no longer exists." };

  // Resetting 2FA weakens an account, so it is owner-only regardless of rank.
  if (target.role === "owner" && actor.id !== target.id) {
    return { status: "error", message: "The owner account can only be changed by the owner." };
  }

  await resetStaffTotp(id);
  await revokeAllSessions(id);

  await logActivity({
    userId: actor.id,
    action: ACTIONS.staffUpdated,
    entity: "user",
    entityId: id,
    meta: { email: target.email, totpReset: true },
    ipHash: await actorIpHash(),
  });

  revalidatePath("/admin/staff");
  return {
    status: "success",
    message: `Two-factor reset for ${target.name}. They will be asked to enrol again at next sign-in.`,
  };
}
