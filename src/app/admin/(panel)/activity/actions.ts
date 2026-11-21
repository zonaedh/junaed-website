"use server";

import { revalidatePath } from "next/cache";
import { ACTIONS, logActivity } from "@/lib/audit";
import { requireRole } from "@/lib/rbac";
import { verifyPassword } from "@/lib/auth/password";
import { getSession } from "@/lib/auth/session";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { clearActivity, type ClearMode } from "@/lib/security/activity-log";

/**
 * Clear the activity log (MVP.md §8.3).
 *
 * Owner only, and password re-entry is required. That is not theatre: this is
 * the one action that destroys the audit trail, so it must be impossible to do
 * from a stolen session alone, and the clear itself is logged afterwards.
 *
 * Order matters — the delete happens first, then the log entry that records it.
 * Logging first would mean the log line describing the clear is itself deleted
 * by the clear.
 */

export type ClearState = { status: "idle" | "success" | "error"; message?: string };

const MODES: readonly ClearMode[] = [
  "older_than_30",
  "older_than_60",
  "older_than_90",
  "all",
];

export async function clearLogs(
  _prev: ClearState,
  formData: FormData,
): Promise<ClearState> {
  const actor = await requireRole("owner");

  const mode = String(formData.get("mode") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!MODES.includes(mode as ClearMode)) {
    return { status: "error", message: "Choose what to clear." };
  }

  if (password === "") {
    return { status: "error", message: "Enter your password to confirm." };
  }

  // Re-read the hash: the session user object deliberately carries no secrets.
  const [row] = await db
    .select({ passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, actor.id))
    .limit(1);

  if (!row) {
    return { status: "error", message: "Could not verify your account." };
  }

  const ok = await verifyPassword(row.passwordHash, password);
  if (!ok) {
    await logActivity({
      userId: actor.id,
      action: ACTIONS.logsCleared,
      entity: "activity_log",
      meta: { attemptedMode: mode, result: "bad_password" },
    });
    return { status: "error", message: "That password is not correct." };
  }

  const session = await getSession();
  const result = await clearActivity(mode as ClearMode);

  await logActivity({
    userId: actor.id,
    action: ACTIONS.logsCleared,
    entity: "activity_log",
    meta: {
      mode,
      deleted: result.deleted,
      cutoff: result.cutoff?.toISOString() ?? null,
      sessionId: session?.sessionId ?? null,
    },
  });

  revalidatePath("/admin/activity");

  const scope =
    mode === "all"
      ? "every entry"
      : `entries older than ${mode.replace("older_than_", "")} days`;

  return {
    status: "success",
    message: `Cleared ${result.deleted} ${result.deleted === 1 ? "entry" : "entries"} (${scope}).`,
  };
}
