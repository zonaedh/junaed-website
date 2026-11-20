"use client";

import { useActionState } from "react";
import { saveSettings, type SettingsState } from "./actions";
import {
  SETTING_DEFINITIONS,
  SETTING_FIELD_NAMES,
  SETTING_GROUPS,
  type SiteSettings,
} from "@/lib/settings-registry";
import { MediaPicker } from "@/components/admin/media-picker";
import type { MediaItem } from "@/lib/media/types";

/**
 * Settings form, generated from the registry in lib/settings.ts.
 *
 * Nothing here is hand-written per field: adding a setting to the registry
 * makes it appear in this form, in its group, with the right input type. That
 * is what keeps the form and the reader from drifting apart.
 */

const initialState: SettingsState = { status: "idle" };

const fieldClass =
  "w-full rounded-[11px] border border-line bg-[#fcfbff] px-3.5 py-2.5 text-[15px] outline-none transition placeholder:text-muted/60 focus:border-violet-400 focus:ring-[3px] focus:ring-violet-100";

function fieldValue(values: SiteSettings, key: string): string {
  // The key → field map lives in the registry. Duplicating it here is exactly
  // the drift D-025 exists to prevent: add a setting and this copy silently
  // returns "" forever.
  const fieldName = SETTING_FIELD_NAMES[key];
  if (!fieldName) return "";

  const value = values[fieldName];
  return typeof value === "string" || typeof value === "number"
    ? String(value)
    : "";
}

export function SettingsForm({
  values,
  media,
}: {
  values: SiteSettings;
  media: MediaItem[];
}) {
  const [state, formAction, pending] = useActionState(saveSettings, initialState);

  return (
    <form action={formAction} className="space-y-6">
      {state.status === "saved" && state.message ? (
        <div
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-[1.5] text-emerald-900"
        >
          {state.message}
        </div>
      ) : null}

      {state.status === "error" && state.message ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-[1.5] text-red-800"
        >
          {state.message}
        </div>
      ) : null}

      {SETTING_GROUPS.map((group) => {
        const definitions = SETTING_DEFINITIONS.filter(
          (definition) => definition.group === group,
        );
        if (definitions.length === 0) return null;

        return (
          <section
            key={group}
            className="rounded-[18px] border border-line bg-white p-5 sm:p-6"
          >
            <h2 className="mb-4 font-display text-lg font-extrabold tracking-[-0.03em]">
              {group}
            </h2>

            <div className="grid gap-4 sm:grid-cols-2">
              {definitions.map((definition) => {
                const error = state.errors?.[definition.key];
                const id = `setting-${definition.key.replace(/\./g, "-")}`;
                const isWide =
                  definition.kind === "textarea" || definition.kind === "boolean";

                if (definition.kind === "boolean") {
                  return (
                    <div key={definition.key} className="sm:col-span-2">
                      <label
                        htmlFor={id}
                        className="flex items-start gap-3 rounded-xl border border-line bg-[#fcfbff] p-3.5"
                      >
                        <input
                          id={id}
                          name={definition.key}
                          type="checkbox"
                          defaultChecked={Boolean(
                            values[
                              "maintenanceEnabled" as keyof SiteSettings
                            ],
                          )}
                          className="mt-0.5 size-4 accent-violet-700"
                        />
                        <span>
                          <span className="block text-sm font-bold">
                            {definition.label}
                          </span>
                          {definition.help ? (
                            <span className="mt-0.5 block text-xs leading-[1.5] text-muted">
                              {definition.help}
                            </span>
                          ) : null}
                        </span>
                      </label>
                    </div>
                  );
                }

                if (definition.kind === "image") {
                  return (
                    <div key={definition.key} className="sm:col-span-2">
                      <MediaPicker
                        name={definition.key}
                        label={definition.label}
                        value={fieldValue(values, definition.key)}
                        items={media}
                        help={definition.help}
                      />
                      {error ? (
                        <p className="mt-1.5 text-xs font-semibold text-red-700">
                          {error}
                        </p>
                      ) : null}
                    </div>
                  );
                }

                return (
                  <div
                    key={definition.key}
                    className={isWide ? "sm:col-span-2" : undefined}
                  >
                    <label
                      htmlFor={id}
                      className="mb-1.5 block text-sm font-bold"
                    >
                      {definition.label}
                    </label>

                    {definition.kind === "textarea" ? (
                      <textarea
                        id={id}
                        name={definition.key}
                        rows={3}
                        maxLength={definition.maxLength}
                        defaultValue={fieldValue(values, definition.key)}
                        placeholder={definition.placeholder}
                        className={fieldClass}
                      />
                    ) : (
                      <input
                        id={id}
                        name={definition.key}
                        type={
                          definition.kind === "email"
                            ? "email"
                            : definition.kind === "number"
                              ? "number"
                              : "text"
                        }
                        maxLength={definition.maxLength}
                        defaultValue={fieldValue(values, definition.key)}
                        placeholder={definition.placeholder}
                        className={fieldClass}
                      />
                    )}

                    {error ? (
                      <p className="mt-1.5 text-xs font-semibold text-red-700">
                        {error}
                      </p>
                    ) : definition.help ? (
                      <p className="mt-1.5 text-xs leading-[1.5] text-muted">
                        {definition.help}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-11 items-center justify-center rounded-[11px] bg-violet-950 px-5 text-sm font-bold text-white transition hover:bg-violet-700 disabled:pointer-events-none disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save settings"}
        </button>
        <p className="text-xs text-muted">
          Changes appear on the public site immediately.
        </p>
      </div>
    </form>
  );
}
