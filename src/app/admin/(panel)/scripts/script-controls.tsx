"use client";

import { useActionState, useState } from "react";
import {
  addScript,
  removeScript,
  revertScript,
  saveScript,
  toggleScript,
  type ScriptActionState,
} from "./actions";
import { scriptWarnings } from "@/lib/analytics/script-rules";

const idle: ScriptActionState = { status: "idle" };

const buttonBase =
  "inline-flex items-center justify-center rounded-[10px] px-3.5 py-2 text-sm font-semibold transition disabled:opacity-60";

const field =
  "w-full rounded-[10px] border border-line bg-white px-3 py-2 text-sm outline-none focus:border-violet-400";

function Feedback({ state }: { state: ScriptActionState }) {
  if (state.status === "idle" || !state.message) return null;
  return (
    <p
      role="status"
      className={
        state.status === "success"
          ? "mt-2 text-sm font-semibold text-emerald-700"
          : "mt-2 text-sm font-semibold text-red-700"
      }
    >
      {state.message}
    </p>
  );
}

/** Live warnings as the snippet is typed (MVP.md §7.2). */
function Warnings({ code }: { code: string }) {
  const warnings = scriptWarnings(code);
  if (warnings.length === 0) return null;
  return (
    <ul className="mt-2 space-y-1">
      {warnings.map((warning) => (
        <li key={warning} className="text-[11px] font-semibold text-amber-700">
          ⚠ {warning}
        </li>
      ))}
    </ul>
  );
}

export function AddScriptForm() {
  const [state, action, pending] = useActionState(addScript, idle);
  const [code, setCode] = useState("");

  return (
    <form action={action} className="rounded-[14px] border border-line bg-white p-4">
      <h2 className="mb-3 text-sm font-bold">Add a snippet</h2>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="mb-1 block text-xs font-bold">
            Name
          </label>
          <input id="name" name="name" required className={field} placeholder="Analytics fallback" />
        </div>
        <div>
          <label htmlFor="location" className="mb-1 block text-xs font-bold">
            Location
          </label>
          <select id="location" name="location" defaultValue="head" className={field}>
            <option value="head">In the head</option>
            <option value="body_start">Right after &lt;body&gt; opens</option>
            <option value="body_end">Before &lt;/body&gt;</option>
          </select>
        </div>
      </div>

      <div className="mt-3">
        <label htmlFor="pageScope" className="mb-1 block text-xs font-bold">
          Page scope
        </label>
        <input
          id="pageScope"
          name="pageScope"
          className={field}
          placeholder="Leave empty for every page, or /blog, /services"
        />
        <p className="mt-1 text-[11px] text-muted">
          One path prefix per line or comma. A prefix covers everything under it.
        </p>
      </div>

      <div className="mt-3">
        <label htmlFor="code" className="mb-1 block text-xs font-bold">
          Snippet
        </label>
        <textarea
          id="code"
          name="code"
          rows={6}
          required
          value={code}
          onChange={(event) => setCode(event.target.value)}
          className={`${field} font-mono text-xs`}
          placeholder="<script>…</script>"
        />
        <Warnings code={code} />
      </div>

      <label className="mt-3 flex items-center gap-2 text-xs">
        <input type="checkbox" name="isActive" className="size-4 accent-violet-700" />
        <span className="font-bold">Active immediately</span>
      </label>

      <div className="mt-3">
        <button
          type="submit"
          disabled={pending}
          className={`${buttonBase} bg-violet-950 text-white hover:bg-violet-800`}
        >
          {pending ? "Adding…" : "Add snippet"}
        </button>
      </div>
      <Feedback state={state} />
    </form>
  );
}

export function ScriptRowControls({
  id,
  name,
  location,
  code,
  pageScope,
  isActive,
  hasPrevious,
}: {
  id: number;
  name: string;
  location: string;
  code: string;
  pageScope: string[] | null;
  isActive: boolean;
  hasPrevious: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(code);
  const [saveState, saveAction, savePending] = useActionState(saveScript, idle);
  const [toggleState, toggleAction, togglePending] = useActionState(toggleScript, idle);
  const [revertState, revertAction, revertPending] = useActionState(revertScript, idle);
  const [removeState, removeAction, removePending] = useActionState(removeScript, idle);

  return (
    <div className="rounded-[12px] border border-line bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 p-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{name}</p>
          <p className="text-[11px] text-muted">
            {location} · {pageScope && pageScope.length > 0 ? pageScope.join(", ") : "all pages"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={
              isActive
                ? "rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700"
                : "rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600"
            }
          >
            {isActive ? "Active" : "Off"}
          </span>
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className={`${buttonBase} border border-line px-3 py-1.5 text-xs hover:bg-violet-50`}
          >
            {open ? "Close" : "Edit"}
          </button>
          <form action={toggleAction}>
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="isActive" value={String(!isActive)} />
            <button
              type="submit"
              disabled={togglePending}
              className={`${buttonBase} border border-line px-3 py-1.5 text-xs hover:bg-violet-50`}
            >
              {isActive ? "Disable" : "Enable"}
            </button>
          </form>
          {hasPrevious ? (
            <form action={revertAction}>
              <input type="hidden" name="id" value={id} />
              <button
                type="submit"
                disabled={revertPending}
                className={`${buttonBase} border border-line px-3 py-1.5 text-xs hover:bg-violet-50`}
              >
                Roll back
              </button>
            </form>
          ) : null}
          <form action={removeAction}>
            <input type="hidden" name="id" value={id} />
            <button
              type="submit"
              disabled={removePending}
              className={`${buttonBase} border border-red-200 px-3 py-1.5 text-xs text-red-700 hover:bg-red-50`}
            >
              Delete
            </button>
          </form>
        </div>
      </div>

      {toggleState.status === "error" && toggleState.message ? (
        <p className="px-3 pb-2 text-xs font-semibold text-red-700">{toggleState.message}</p>
      ) : null}
      {revertState.status === "success" || revertState.status === "error" ? (
        <p className="px-3 pb-2 text-xs font-semibold text-amber-700">{revertState.message}</p>
      ) : null}
      {removeState.status === "error" && removeState.message ? (
        <p className="px-3 pb-2 text-xs font-semibold text-red-700">{removeState.message}</p>
      ) : null}

      {open ? (
        <form action={saveAction} className="border-t border-line p-3">
          <input type="hidden" name="id" value={id} />
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-bold" htmlFor={`name-${id}`}>
                Name
              </label>
              <input id={`name-${id}`} name="name" defaultValue={name} className={field} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold" htmlFor={`loc-${id}`}>
                Location
              </label>
              <select
                id={`loc-${id}`}
                name="location"
                defaultValue={location}
                className={field}
              >
                <option value="head">In the head</option>
                <option value="body_start">Right after &lt;body&gt; opens</option>
                <option value="body_end">Before &lt;/body&gt;</option>
              </select>
            </div>
          </div>

          <div className="mt-3">
            <label className="mb-1 block text-xs font-bold" htmlFor={`scope-${id}`}>
              Page scope
            </label>
            <input
              id={`scope-${id}`}
              name="pageScope"
              defaultValue={pageScope?.join(", ") ?? ""}
              className={field}
              placeholder="Empty for every page"
            />
          </div>

          <div className="mt-3">
            <label className="mb-1 block text-xs font-bold" htmlFor={`code-${id}`}>
              Snippet
            </label>
            <textarea
              id={`code-${id}`}
              name="code"
              rows={6}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              className={`${field} font-mono text-xs`}
            />
            <Warnings code={draft} />
          </div>

          <label className="mt-3 flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              name="isActive"
              defaultChecked={isActive}
              className="size-4 accent-violet-700"
            />
            <span className="font-bold">Active</span>
          </label>

          <div className="mt-3">
            <button
              type="submit"
              disabled={savePending}
              className={`${buttonBase} bg-violet-950 text-white hover:bg-violet-800`}
            >
              {savePending ? "Saving…" : "Save changes"}
            </button>
          </div>
          <Feedback state={saveState} />
        </form>
      ) : null}
    </div>
  );
}