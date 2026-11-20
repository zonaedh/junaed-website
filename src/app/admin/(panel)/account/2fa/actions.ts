"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { users } from "@/db/schema";
import { ACTIONS, logActivity } from "@/lib/audit";
import { getSession } from "@/lib/auth/session";
import {
  consumeRecoveryCode,
  generateRecoveryCodes,
  verifyTotpCode,
} from "@/lib/auth/totp";
import { totpCodeSchema } from "@/lib/validation/auth";

/**
 * 2FA Server Actions.
 *
 * Both actions re-check the session themselves. A page-level guard is not
 * enough: Server Actions are independently addressable endpoints.
 */

export type TwoFactorState = {
  status: "idle" | "error" | "confirmed";
  message?: string;
  /** Plaintext recovery codes, shown exactly once after confirmation. */
  recoveryCodes?: string[];
};

export async function confirmTwoFactor(
  _prevState: TwoFactorState,
  formData: FormData,
): Promise<TwoFactorState> {
  const session = await getSession();
  if (!session) {
    return { status: "error", message: "Your session has expired. Sign in again." };
  }

  const parsed = totpCodeSchema.safeParse({ code: formData.get("code") });
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "Enter a valid code.",
    };
  }

  const rows = await db
    .select({ totpSecret: users.totpSecret, totpEnabledAt: users.totpEnabledAt })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  const record = rows[0];
  if (!record?.totpSecret) {
    return {
      status: "error",
      message: "No pending secret found. Reload the page to start again.",
    };
  }

  if (record.totpEnabledAt) {
    return { status: "error", message: "Two-factor is already enabled." };
  }

  if (!verifyTotpCode(record.totpSecret, parsed.data.code)) {
    return {
      status: "error",
      message: "That code is not valid. Check the app and try the current code.",
    };
  }

  // Code proven. Generate recovery codes and mark the account enrolled.
  const recovery = await generateRecoveryCodes();

  await db
    .update(users)
    .set({
      totpEnabledAt: new Date(),
      recoveryCodes: recovery.hashed,
      updatedAt: new Date(),
    })
    .where(eq(users.id, session.user.id));

  await logActivity({
    userId: session.user.id,
    action: ACTIONS.totpEnabled,
    entity: "user",
    entityId: session.user.id,
    meta: { recoveryCodesIssued: recovery.plain.length },
  });

  revalidatePath("/account/2fa");
  revalidatePath("/dashboard");

  return {
    status: "confirmed",
    message: "Two-factor authentication is now enabled.",
    recoveryCodes: recovery.plain,
  };
}

export type RecoveryState = {
  status: "idle" | "error" | "ok";
  message?: string;
};

/**
 * Consume a recovery code at login time. Exposed here so the login flow can
 * call it when the user has lost their authenticator.
 */
export async function useRecoveryCode(
  _prevState: RecoveryState,
  formData: FormData,
): Promise<RecoveryState> {
  const session = await getSession();
  if (!session) {
    return { status: "error", message: "Your session has expired." };
  }

  const code = String(formData.get("code") ?? "").trim();
  if (!code) return { status: "error", message: "Enter a recovery code." };

  const rows = await db
    .select({ recoveryCodes: users.recoveryCodes })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  const result = await consumeRecoveryCode(code, rows[0]?.recoveryCodes);
  if (!result) {
    return { status: "error", message: "That recovery code is not valid." };
  }

  await db
    .update(users)
    .set({ recoveryCodes: result.remaining, updatedAt: new Date() })
    .where(eq(users.id, session.user.id));

  await logActivity({
    userId: session.user.id,
    action: "auth.recovery_code.used",
    entity: "user",
    entityId: session.user.id,
    meta: { remaining: result.remaining.length },
  });

  return {
    status: "ok",
    message: `Code accepted. ${result.remaining.length} recovery codes remaining.`,
  };
}
