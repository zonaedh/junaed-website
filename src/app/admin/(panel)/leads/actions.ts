"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/rbac";
import { logActivity, ACTIONS } from "@/lib/audit";
import {
  deleteLead,
  listLeadsForExport,
  setLeadNotes,
  setLeadStatus,
} from "@/lib/leads/repository";
import type { LeadStatus } from "@/lib/leads/repository";
import {
  formatAutoReply,
  hasResendConfig,
  sendEmail,
} from "@/lib/contact/notify";
import { getLead } from "@/lib/leads/repository";
import { getSettings } from "@/lib/settings";

/**
 * Leads admin actions.
 *
 * Every action re-checks the role on the server. The UI hides what a role
 * cannot do, but hiding a button is not a permission check.
 */

export type LeadActionState = {
  status: "idle" | "success" | "error";
  message?: string;
};

const VALID_STATUSES: readonly LeadStatus[] = [
  "new",
  "read",
  "replied",
  "archived",
  "spam",
];

function revalidateLeads() {
  revalidatePath("/leads");
  revalidatePath("/dashboard");
}

export async function updateLeadStatus(
  _prev: LeadActionState,
  formData: FormData,
): Promise<LeadActionState> {
  const user = await requireRole("support");

  const id = Number(formData.get("id"));
  const status = String(formData.get("status") ?? "");

  if (!Number.isInteger(id) || id <= 0) {
    return { status: "error", message: "Invalid lead." };
  }
  if (!VALID_STATUSES.includes(status as LeadStatus)) {
    return { status: "error", message: "Invalid status." };
  }

  const row = await setLeadStatus(id, status as LeadStatus);
  if (!row) return { status: "error", message: "Lead not found." };

  await logActivity({
    userId: user.id,
    action: ACTIONS.leadStatus,
    entity: "lead",
    entityId: String(id),
    meta: { status },
  });

  revalidateLeads();
  revalidatePath(`/leads/${id}`);
  return { status: "success", message: `Marked as ${status}.` };
}

export async function saveLeadNotes(
  _prev: LeadActionState,
  formData: FormData,
): Promise<LeadActionState> {
  const user = await requireRole("support");

  const id = Number(formData.get("id"));
  const notes = String(formData.get("notes") ?? "").slice(0, 5000);

  if (!Number.isInteger(id) || id <= 0) {
    return { status: "error", message: "Invalid lead." };
  }

  const row = await setLeadNotes(id, notes);
  if (!row) return { status: "error", message: "Lead not found." };

  await logActivity({
    userId: user.id,
    action: ACTIONS.leadNotes,
    entity: "lead",
    entityId: String(id),
    meta: { length: notes.length },
  });

  revalidatePath(`/leads/${id}`);
  return { status: "success", message: "Notes saved." };
}

export async function removeLead(
  _prev: LeadActionState,
  formData: FormData,
): Promise<LeadActionState> {
  const user = await requireRole("admin");

  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) {
    return { status: "error", message: "Invalid lead." };
  }

  const ok = await deleteLead(id);
  if (!ok) return { status: "error", message: "Lead not found." };

  await logActivity({
    userId: user.id,
    action: ACTIONS.leadDelete,
    entity: "lead",
    entityId: String(id),
  });

  revalidateLeads();
  return { status: "success", message: "Lead deleted." };
}

/**
 * Reply to a lead by email.
 *
 * Sends through Resend when configured. Without a key this reports honestly
 * that nothing was sent rather than pretending.
 */
export async function replyToLead(
  _prev: LeadActionState,
  formData: FormData,
): Promise<LeadActionState> {
  const user = await requireRole("support");

  const id = Number(formData.get("id"));
  const body = String(formData.get("body") ?? "").trim();

  if (!Number.isInteger(id) || id <= 0) {
    return { status: "error", message: "Invalid lead." };
  }
  if (body.length < 5) {
    return { status: "error", message: "Write a reply first." };
  }

  const lead = await getLead(id);
  if (!lead) return { status: "error", message: "Lead not found." };

  if (!hasResendConfig()) {
    return {
      status: "error",
      message:
        "Email is not configured. Add RESEND_API_KEY to send replies from here.",
    };
  }

  const settings = await getSettings();
  const escaped = body
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");

  const result = await sendEmail({
    to: lead.email,
    subject: `Re: your enquiry — ${settings.name}`,
    html: `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.7;color:#1b1730">${escaped}</div>`,
    text: body,
  });

  if (!result.ok) {
    return { status: "error", message: `Send failed: ${result.reason}` };
  }

  await setLeadStatus(id, "replied");
  await logActivity({
    userId: user.id,
    action: ACTIONS.leadReply,
    entity: "lead",
    entityId: String(id),
  });

  revalidateLeads();
  revalidatePath(`/leads/${id}`);
  return { status: "success", message: "Reply sent." };
}

/** CSV export. Returns the file contents; the route streams it. */
export async function exportLeadsCsv(): Promise<string> {
  await requireRole("admin");

  const rows = await listLeadsForExport();

  const header = [
    "id",
    "created_at",
    "name",
    "email",
    "phone",
    "service",
    "status",
    "source_page",
    "message",
    "notes",
  ];

  const escape = (value: unknown): string => {
    if (value === null || value === undefined) return "";
    const text = String(value);
    // Quote when the value contains a delimiter, a quote or a newline.
    if (/[",\n\r]/.test(text)) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  };

  const lines = [header.join(",")];
  for (const row of rows) {
    lines.push(
      [
        row.id,
        row.createdAt instanceof Date
          ? row.createdAt.toISOString()
          : String(row.createdAt),
        row.name,
        row.email,
        row.phone,
        row.service,
        row.status,
        row.sourcePage,
        row.message,
        row.notes,
      ]
        .map(escape)
        .join(","),
    );
  }

  return lines.join("\r\n");
}

/** Send a test message through the configured channels. */
export async function sendTestNotification(): Promise<LeadActionState> {
  await requireRole("admin");

  const { hasTelegramConfig, sendTelegram } = await import(
    "@/lib/contact/notify"
  );

  const results: string[] = [];

  if (hasTelegramConfig()) {
    const result = await sendTelegram(
      "Test message from your website admin. If you can read this, Telegram notifications are working.",
    );
    results.push(result.ok ? "Telegram: sent" : `Telegram: ${result.reason}`);
  } else {
    results.push("Telegram: not configured");
  }

  if (hasResendConfig()) {
    const settings = await getSettings();
    if (!settings.email) {
      results.push("Email: no recipient set in Settings");
    } else {
      const email = formatAutoReply(
        {
          name: "Test",
          email: settings.email,
          message: "This is a test message from your website admin.",
          createdAt: new Date(),
        },
        settings.name,
      );
      const result = await sendEmail({
        to: settings.email,
        subject: "Test email from your website admin",
        html: email.html,
        text: email.text,
      });
      results.push(result.ok ? "Email: sent" : `Email: ${result.reason}`);
    }
  } else {
    results.push("Email: not configured");
  }

  return { status: "success", message: results.join(" · ") };
}
