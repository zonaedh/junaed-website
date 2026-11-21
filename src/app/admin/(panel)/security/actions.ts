"use server";

import { revalidatePath } from "next/cache";
import { ACTIONS, logActivity } from "@/lib/audit";
import { requireRoleOrThrow } from "@/lib/rbac";
import { addBlock, removeBlock } from "@/lib/security/blocks";
import { clientAddressFromHeaders } from "@/lib/security/ip";
import { hashIp } from "@/lib/security/hash";
import { headers } from "next/headers";

/**
 * Block-list actions (MVP.md §8.2).
 *
 * Owner only. Blocking an address is a security control, and a compromised
 * editor account must not be able to lock the owner out of their own admin.
 *
 * Every change is logged with the actor and the reason, because "who blocked
 * this and why" is the question asked weeks later.
 */

export type BlockState = { status: "idle" | "success" | "error"; message?: string };

async function actorMeta() {
  const headerList = await headers();
  return { ipHash: hashIp(clientAddressFromHeaders(headerList)) };
}

export async function createBlock(
  _prev: BlockState,
  formData: FormData,
): Promise<BlockState> {
  const actor = await requireRoleOrThrow("owner");

  const ip = String(formData.get("ip") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  const expiry = String(formData.get("expiresAt") ?? "").trim();

  if (ip === "") {
    return { status: "error", message: "Enter an IP address or CIDR range." };
  }

  let expiresAt: Date | null = null;
  if (expiry !== "") {
    const parsed = new Date(`${expiry}T23:59:59.999Z`);
    if (Number.isNaN(parsed.getTime())) {
      return { status: "error", message: "That expiry date is not valid." };
    }
    expiresAt = parsed;
  }

  const result = await addBlock({
    ip,
    reason: reason || null,
    expiresAt,
    createdBy: actor.id,
  });

  if (!result.ok) {
    return { status: "error", message: result.error };
  }

  const meta = await actorMeta();
  await logActivity({
    userId: actor.id,
    action: ACTIONS.ipBlocked,
    entity: "blocked_ip",
    entityId: result.row.id,
    meta: { ip: result.row.ip, reason: reason || null, expiresAt: expiresAt?.toISOString() ?? null },
    ipHash: meta.ipHash,
  });

  revalidatePath("/admin/security");
  return { status: "success", message: `${result.row.ip} is now blocked.` };
}

export async function deleteBlock(
  _prev: BlockState,
  formData: FormData,
): Promise<BlockState> {
  const actor = await requireRoleOrThrow("owner");
  const id = Number(formData.get("id"));

  if (!Number.isFinite(id) || id <= 0) {
    return { status: "error", message: "That entry no longer exists." };
  }

  const removed = await removeBlock(id);
  if (!removed) {
    return { status: "error", message: "That entry no longer exists." };
  }

  const meta = await actorMeta();
  await logActivity({
    userId: actor.id,
    action: ACTIONS.ipUnblocked,
    entity: "blocked_ip",
    entityId: id,
    ipHash: meta.ipHash,
  });

  revalidatePath("/admin/security");
  return { status: "success", message: "Block removed." };
}

/**
 * Block an address in one click from a lead or a log entry.
 *
 * Takes the address from the form rather than looking it up, because the caller
 * already has it. The address is validated inside `addBlock`.
 */
export async function quickBlock(
  _prev: BlockState,
  formData: FormData,
): Promise<BlockState> {
  const actor = await requireRoleOrThrow("owner");
  const ip = String(formData.get("ip") ?? "").trim();
  const reason = String(formData.get("reason") ?? "Blocked from an admin entry").trim();

  if (ip === "") {
    return { status: "error", message: "No address to block." };
  }

  const result = await addBlock({
    ip,
    reason,
    expiresAt: null,
    createdBy: actor.id,
  });

  if (!result.ok) {
    return { status: "error", message: result.error };
  }

  const meta = await actorMeta();
  await logActivity({
    userId: actor.id,
    action: ACTIONS.ipBlocked,
    entity: "blocked_ip",
    entityId: result.row.id,
    meta: { ip: result.row.ip, reason, source: "quick_block" },
    ipHash: meta.ipHash,
  });

  revalidatePath("/admin/security");
  return { status: "success", message: `${result.row.ip} is now blocked.` };
}
