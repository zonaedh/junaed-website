"use client";

import { useActionState } from "react";
import { runBackupNow, type BackupState } from "./actions";

const idle: BackupState = { status: "idle" };

/**
 * "Run backup now" (MVP.md §9.1).
 *
 * The button dispatches a GitHub Actions workflow. When no token is configured
 * the action returns a plain explanation rather than pretending a run started,
 * so this component only has to show whatever came back.
 */
export function RunBackupButton() {
  const [state, action, pending] = useActionState(runBackupNow, idle);

  return (
    <div className="rounded-[14px] border border-line bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold">Run a backup now</h2>
          <p className="mt-0.5 text-xs text-muted">
            Triggers the weekly workflow out of schedule. The scheduled run is every
            Sunday at 02:00 UTC.
          </p>
        </div>
        <form action={action}>
          <button
            type="submit"
            disabled={pending}
            className="rounded-[10px] bg-violet-600 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-60"
          >
            {pending ? "Dispatching…" : "Run backup now"}
          </button>
        </form>
      </div>

      {state.status !== "idle" && state.message ? (
        <p
          role="status"
          className={`mt-3 rounded-[10px] px-3 py-2 text-xs ${
            state.status === "success"
              ? "bg-emerald-50 text-emerald-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
