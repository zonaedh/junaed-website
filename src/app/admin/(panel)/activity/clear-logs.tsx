"use client";

import { useActionState, useState } from "react";
import { clearLogs, type ClearState } from "./actions";

const idle: ClearState = { status: "idle" };

const field =
  "w-full rounded-[10px] border border-line bg-white px-3 py-2 text-sm outline-none focus:border-violet-400";

/**
 * Log retention panel (MVP.md §8.3).
 *
 * Owner only, and the password field is the point: this is the one control in
 * the admin that destroys the audit trail, so it must not be reachable from a
 * borrowed session. The confirmation text names the exact scope before the
 * button is pressed.
 */
export function ClearLogsPanel() {
  const [state, action, pending] = useActionState(clearLogs, idle);
  const [mode, setMode] = useState("older_than_90");
  const [open, setOpen] = useState(false);

  return (
    <section className="rounded-[14px] border border-line bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold">Retention</h2>
          <p className="mt-1 text-[13px] leading-[1.6] text-muted">
            The default retention is 90 days. Clearing is permanent, requires
            your password, and is itself recorded in the log.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="inline-flex items-center rounded-[10px] border border-red-200 px-3.5 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50"
        >
          {open ? "Cancel" : "Clear logs"}
        </button>
      </div>

      {open ? (
        <form action={action} className="mt-4 space-y-3 border-t border-line pt-4">
          <div>
            <label htmlFor="mode" className="mb-1 block text-xs font-bold">
              What to clear
            </label>
            <select
              id="mode"
              name="mode"
              value={mode}
              onChange={(event) => setMode(event.target.value)}
              className={field}
            >
              <option value="older_than_30">Entries older than 30 days</option>
              <option value="older_than_60">Entries older than 60 days</option>
              <option value="older_than_90">Entries older than 90 days</option>
              <option value="all">Every entry (cannot be undone)</option>
            </select>
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-xs font-bold">
              Your password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className={field}
              placeholder="Re-enter to confirm"
            />
          </div>

          <p className="text-[11px] font-semibold text-amber-700">
            {mode === "all"
              ? "This deletes every log entry, including this action's own history."
              : `This deletes entries older than ${mode.replace("older_than_", "")} days.`}
          </p>

          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center rounded-[10px] bg-red-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-800 disabled:opacity-60"
          >
            {pending ? "Clearing…" : "Confirm clear"}
          </button>

          {state.status !== "idle" && state.message ? (
            <p
              role="status"
              className={
                state.status === "success"
                  ? "text-sm font-semibold text-emerald-700"
                  : "text-sm font-semibold text-red-700"
              }
            >
              {state.message}
            </p>
          ) : null}
        </form>
      ) : null}
    </section>
  );
}
