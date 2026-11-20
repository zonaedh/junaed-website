"use server";

import { revalidateTag } from "next/cache";
import { db } from "@/db";
import { settings as settingsTable } from "@/db/schema";
import { ACTIONS, logActivity } from "@/lib/audit";
import { requireRoleOrThrow, UnauthorizedError } from "@/lib/rbac";
import {
  SETTING_DEFINITIONS,
  settingDefinition,
  type SettingKind,
} from "@/lib/settings";

/**
 * Settings write path.
 *
 * Rules this follows, matching the rest of the admin:
 *  - the role is re-checked here, not just in the page (Server Actions are
 *    independently addressable endpoints)
 *  - every value is validated against its registry definition, so a crafted
 *    POST cannot write an arbitrary type into JSONB
 *  - the audit log records which keys changed, never the values (they can
 *    contain an email address)
 *  - `revalidateTag("settings")` is what makes the change visible on the
 *    public site â€” without it the cached read would serve the old value
 */

export type SettingsState = {
  status: "idle" | "saved" | "error";
  message?: string;
  /** Field-level errors, keyed by setting key. */
  errors?: Record<string, string>;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(
  definition: { key: string; label: string; kind: SettingKind; maxLength?: number },
  raw: FormDataEntryValue | null,
): { value: string | number | boolean } | { error: string } {
  if (definition.kind === "boolean") {
    // An unchecked checkbox sends nothing at all.
    return { value: raw === "on" || raw === "true" };
  }

  const text = typeof raw === "string" ? raw.trim() : "";

  if (definition.maxLength && text.length > definition.maxLength) {
    return {
      error: `${definition.label} must be ${definition.maxLength} characters or fewer.`,
    };
  }

  if (definition.kind === "number") {
    const value = Number(text);
    if (text === "" || !Number.isFinite(value) || value < 0) {
      return { error: `${definition.label} must be a number of 0 or more.` };
    }
    return { value };
  }

  if (definition.kind === "email" && text !== "" && !EMAIL_PATTERN.test(text)) {
    return { error: `${definition.label} must be a valid email address.` };
  }

  // Image fields carry a media id. Empty means "no image", which is valid.
  if (definition.kind === "image") {
    if (text === "") return { value: "" };
    if (!/^\d+$/.test(text)) {
      return { error: `${definition.label} must be chosen from the media library.` };
    }
    return { value: text };
  }

  return { value: text };
}

export async function saveSettings(
  _prevState: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  let user;
  try {
    user = await requireRoleOrThrow("admin");
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { status: "error", message: error.message };
    }
    throw error;
  }

  const errors: Record<string, string> = {};
  const values: { key: string; value: string | number | boolean }[] = [];

  for (const definition of SETTING_DEFINITIONS) {
    const result = validate(definition, formData.get(definition.key));
    if ("error" in result) {
      errors[definition.key] = result.error;
    } else {
      values.push({ key: definition.key, value: result.value });
    }
  }

  if (Object.keys(errors).length > 0) {
    return {
      status: "error",
      message: "Some fields need attention before this can be saved.",
      errors,
    };
  }

  try {
    for (const entry of values) {
      const definition = settingDefinition(entry.key);
      if (!definition) continue;

      await db
        .insert(settingsTable)
        .values({
          key: entry.key,
          value: entry.value,
          updatedBy: user.id,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: settingsTable.key,
          set: {
            value: entry.value,
            updatedBy: user.id,
            updatedAt: new Date(),
          },
        });
    }
  } catch (error) {
    console.error("[settings] save failed", error);
    return {
      status: "error",
      message: "Could not save settings. Please try again.",
    };
  }

  // This is the line that makes the change visible on the public site.
  revalidateTag("settings", { expire: 0 });

  await logActivity({
    userId: user.id,
    action: ACTIONS.settingsUpdated,
    entity: "settings",
    meta: { keys: values.map((entry) => entry.key) },
  });

  return { status: "saved", message: "Settings saved. The site is updated." };
}
