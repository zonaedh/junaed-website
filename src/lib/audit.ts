import { db } from "@/db";
import { activityLogs } from "@/db/schema";

/**
 * Activity log writer (MVP.md §8.3).
 *
 * Every admin mutation calls this. It must never throw into the caller: a
 * failed audit write should not roll back a successful user action, but it
 * must be visible in the server logs.
 *
 * `meta` must never contain secrets, password hashes or full request bodies.
 * Record identifiers and changed field names only.
 */

export type ActivityInput = {
  userId?: number | null;
  action: string;
  entity?: string | null;
  entityId?: string | number | null;
  meta?: Record<string, unknown> | null;
  ipHash?: string | null;
};

export async function logActivity(input: ActivityInput): Promise<void> {
  try {
    await db.insert(activityLogs).values({
      userId: input.userId ?? null,
      action: input.action,
      entity: input.entity ?? null,
      entityId: input.entityId != null ? String(input.entityId) : null,
      meta: input.meta ?? null,
      ipHash: input.ipHash ?? null,
    });
  } catch (error) {
    console.error("[audit] failed to write activity log", {
      action: input.action,
      entity: input.entity,
      error: error instanceof Error ? error.message : "unknown",
    });
  }
}

/** Common action names, so filters in the admin UI stay consistent. */
export const ACTIONS = {
  loginSuccess: "auth.login.success",
  loginFailed: "auth.login.failed",
  loginLocked: "auth.login.locked",
  logout: "auth.logout",
  totpEnabled: "auth.totp.enabled",
  totpDisabled: "auth.totp.disabled",
  passwordChanged: "auth.password.changed",
  passwordResetRequested: "auth.password.reset_requested",
  passwordResetCompleted: "auth.password.reset_completed",
  sessionRevoked: "auth.session.revoked",
  staffInvited: "staff.invited",
  staffUpdated: "staff.updated",
  staffDeactivated: "staff.deactivated",
  settingsUpdated: "settings.updated",
  pageUpdated: "page.updated",
  mediaUploaded: "media.uploaded",
  mediaUpdated: "media.updated",
  mediaDeleted: "media.deleted",
  mediaReplaced: "media.replaced",
  postCreated: "post.created",
  postUpdated: "post.updated",
  postDeleted: "post.deleted",
  categoryCreated: "category.created",
  portfolioCreated: "portfolio.created",
  portfolioUpdated: "portfolio.updated",
  portfolioDeleted: "portfolio.deleted",
  portfolioReordered: "portfolio.reordered",
  leadStatus: "lead.status",
  leadNotes: "lead.notes",
  leadReply: "lead.reply",
  leadDelete: "lead.deleted",
  leadExported: "lead.exported",
  redirectCreated: "seo.redirect.created",
  redirectUpdated: "seo.redirect.updated",
  redirectDeleted: "seo.redirect.deleted",
  notFoundCleared: "seo.notfound.cleared",
  scriptCreated: "script.created",
  scriptUpdated: "script.updated",
  scriptDeleted: "script.deleted",
  scriptRolledBack: "script.rolled_back",
  alertRead: "alert.read",
} as const;
