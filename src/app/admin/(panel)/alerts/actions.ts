"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/rbac";
import { logActivity, ACTIONS } from "@/lib/audit";
import { markAlertRead, markAllAlertsRead } from "@/lib/analytics/repository";

export type AlertActionState = {
  status: "idle" | "success" | "error";
  message?: string;
};

export async function readAlert(
  _prev: AlertActionState,
  formData: FormData,
): Promise<AlertActionState> {
  const user = await requireRole("support");
  void _prev;

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) {
    return { status: "error", message: "Invalid alert." };
  }

  const ok = await markAlertRead(id);
  if (!ok) return { status: "error", message: "Alert not found." };

  await logActivity({
    userId: user.id,
    action: ACTIONS.alertRead,
    entity: "alert",
    entityId: id,
  });

  revalidatePath("/alerts");
  revalidatePath("/dashboard");
  return { status: "success", message: "Marked as read." };
}

export async function readAllAlerts(
  _prev: AlertActionState,
): Promise<AlertActionState> {
  const user = await requireRole("support");
  void _prev;

  const count = await markAllAlertsRead();

  await logActivity({
    userId: user.id,
    action: ACTIONS.alertRead,
    entity: "alert",
    meta: { count },
  });

  revalidatePath("/alerts");
  revalidatePath("/dashboard");
  return { status: "success", message: `Marked ${count} alert${count === 1 ? "" : "s"} as read.` };
}