"use client";

import { useActionState } from "react";
import { savePage, type PageState } from "../actions";
import type { PageContent, PageDefinition } from "@/lib/pages-definitions";
import { MediaPicker } from "@/components/admin/media-picker";
import type { MediaItem } from "@/lib/media/types";

/**
 * One form per page, generated from the page's field definitions.
 *
 * The status selector is part of the form on purpose: saving a draft must not
 * publish it, and publishing must be a deliberate act.
 */

const initialState: PageState = { status: "idle" };

const fieldClass =
  "w-full rounded-[11px] border border-line bg-[#fcfbff] px-3.5 py-2.5 text-[15px] leading-[1.6] outline-none transition placeholder:text-muted/60 focus:border-violet-400 focus:ring-[3px] focus:ring-violet-100";

export function PageForm({
  definition,
  content,
  status,
  exists,
  media,
}: {
  definition: PageDefinition;
  content: PageContent;
  status: "draft" | "scheduled" | "published" | "archived";
  exists: boolean;
  media: MediaItem[];
}) {
  const action = savePage.bind(null, definition.key);
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="space-y-5">
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

      {!exists ? (
        <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm leading-[1.5] text-violet-900">
          This page has no saved content yet. The fields below show the current
          defaults — the public site is already rendering them. Save to make
          them editable.
        </div>
      ) : null}

      <section className="rounded-[18px] border border-line bg-white p-5 sm:p-6">
        <div className="grid gap-4">
          {definition.fields.map((field) => {
            const error = state.errors?.[field.key];
            const id = `page-${field.key}`;

            return (
              <div key={field.key}>
                {field.kind === "image" ? (
                  <MediaPicker
                    name={field.key}
                    label={field.label}
                    value={content[field.key] ?? ""}
                    items={media}
                    help={field.help}
                  />
                ) : (
                  <>
                    <label htmlFor={id} className="mb-1.5 block text-sm font-bold">
                      {field.label}
                    </label>

                    {field.kind === "text" ? (
                      <input
                        id={id}
                        name={field.key}
                        type="text"
                        maxLength={field.maxLength}
                        defaultValue={content[field.key] ?? field.default}
                        className={fieldClass}
                      />
                    ) : (
                      <textarea
                        id={id}
                        name={field.key}
                        rows={field.kind === "longtext" ? 8 : 3}
                        maxLength={field.maxLength}
                        defaultValue={content[field.key] ?? field.default}
                        className={fieldClass}
                      />
                    )}

                    {field.help ? (
                      <p className="mt-1.5 text-xs leading-[1.5] text-muted">
                        {field.help}
                      </p>
                    ) : null}
                  </>
                )}

                {error ? (
                  <p className="mt-1.5 text-xs font-semibold text-red-700">
                    {error}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-[18px] border border-line bg-white p-5 sm:p-6">
        <label htmlFor="page-status" className="mb-1.5 block text-sm font-bold">
          Status
        </label>
        <select
          id="page-status"
          name="status"
          defaultValue={status === "scheduled" ? "draft" : status}
          className={fieldClass}
        >
          <option value="draft">Draft — public site keeps the published version</option>
          <option value="published">Published — live immediately</option>
          <option value="archived">Archived — public site shows defaults</option>
        </select>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-11 items-center justify-center rounded-[11px] bg-violet-950 px-5 text-sm font-bold text-white transition hover:bg-violet-700 disabled:pointer-events-none disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save page"}
        </button>
        <p className="text-xs text-muted">
          Published changes appear on the public site immediately.
        </p>
      </div>
    </form>
  );
}
