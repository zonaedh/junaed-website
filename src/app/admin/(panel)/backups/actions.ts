"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { ACTIONS, logActivity } from "@/lib/audit";
import { backupFilename } from "@/lib/backup/rules";
import { dispatchBackupWorkflow } from "@/lib/backup/dispatch";
import {
  BACKUPS_TAG,
  logBackupDispatch,
  markBackupFailed,
  recordBackup,
} from "@/lib/backup/repository";
import { requireRoleOrThrow } from "@/lib/rbac";
import { hashIp } from "@/lib/security/hash";
import { clientAddressFromHeaders } from "@/lib/security/ip";
import { revalidateTag } from "next/cache";

/**
 * Backup actions (MVP.md §9.1).
 *
 * Owner only. A backup run touches the whole database, and the restore path is
 * the one operation where a mistake is unrecoverable, so it stays with the owner.
 *
 * The `running` row is written *before* the dispatch, so the page shows that
 * something started. If the dispatch fails the row is immediately marked failed
 * rather than left hanging as `running` forever.
 */

export type BackupState = { status: "idle" | "success" | "error"; message?: string };

async function actorMeta() {
  const headerList = await headers();
  return { ipHash: hashIp(clientAddressFromHeaders(headerList)) };
}

export async function runBackupNow(): Promise<BackupState> {
  const actor = await requireRoleOrThrow("owner");
  const meta = await actorMeta();

  // Reserve a row first so the page reflects the attempt immediately.
  const rowId = await recordBackup({
    filename: backupFilename(new Date()),
    status: "running",
    message: "Dispatched from the admin panel.",
  });

  const result = await dispatchBackupWorkflow();

  if (!result.ok) {
    await markBackupFailed(rowId, result.message);
    await logBackupDispatch({
      userId: actor.id,
      ipHash: meta.ipHash,
      ok: false,
      detail: result.message,
    });
    revalidateTag(BACKUPS_TAG, { expire: 0 });
    revalidatePath("/admin/backups");
    return { status: "error", message: result.message };
  }

  await logActivity({
    userId: actor.id,
    action: ACTIONS.backupRequested,
    entity: "backups_log",
    entityId: rowId,
    meta: { detail: result.message },
    ipHash: meta.ipHash,
  });

  revalidateTag(BACKUPS_TAG, { expire: 0 });
  revalidatePath("/admin/backups");
  return {
    status: "success",
    message:
      "Backup workflow dispatched. It runs in GitHub Actions; the row here updates " +
      "when the workflow writes its result.",
  };
}
