"use client";

import { useActionState } from "react";
import {
  removeLead,
  replyToLead,
  saveLeadNotes,
  updateLeadStatus,
  type LeadActionState,
} from "./actions";

const idle: LeadActionState = { status: "idle" };

const buttonBase =
  "inline-flex items-center justify-center rounded-[10px] px-3.5 py-2 text-sm font-semibold transition disabled:opacity-60";

const STATUSES = ["new", "read", "replied", "archived", "spam"] as const;

export function LeadControls({
  id,
  status,
  notes,
  canDelete,
  canReply,
}: {
  id: number;
  status: string;
  notes: string | null;
  canDelete: boolean;
  canReply: boolean;
}) {
  const [statusState, statusAction, statusPending] = useActionState(
    updateLeadStatus,
    idle,
  );
  const [notesState, notesAction, notesPending] = useActionState(
    saveLeadNotes,
    idle,
  );
  const [replyState, replyAction, replyPending] = useActionState(
    replyToLead,
    idle,
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    removeLead,
    idle,
  );

  return (
    <div className="grid gap-5">
      {/* ---- status ---- */}
      <section className="rounded-[16px] border border-line bg-white p-5">
        <h2 className="mb-3 text-sm font-bold">Status</h2>
        <div className="flex flex-wrap gap-2">
          {STATUSES.map((value) => (
            <form key={value} action={statusAction}>
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="status" value={value} />
              <button
                type="submit"
                disabled={statusPending || value === status}
                className={`${buttonBase} ${
                  value === status
                    ? "border border-violet-950 bg-violet-950 text-white"
                    : "border border-line bg-white text-muted hover:border-violet-200 hover:text-violet-700"
                }`}
              >
                {value}
              </button>
            </form>
          ))}
        </div>
        {statusState.message ? (
          <p
            className={`mt-3 text-sm ${statusState.status === "error" ? "text-red-700" : "text-emerald-700"}`}
          >
            {statusState.message}
          </p>
        ) : null}
      </section>

      {/* ---- reply ---- */}
      {canReply ? (
        <section className="rounded-[16px] border border-line bg-white p-5">
          <h2 className="mb-3 text-sm font-bold">Reply by email</h2>
          <form action={replyAction} className="grid gap-3">
            <input type="hidden" name="id" value={id} />
            <textarea
              name="body"
              rows={5}
              placeholder="Write your reply…"
              className="w-full rounded-[11px] border border-line bg-[#fcfbff] px-4 py-3 text-sm outline-none focus:border-violet-400 focus:ring-[3px] focus:ring-violet-100"
            />
            <button
              type="submit"
              disabled={replyPending}
              className={`${buttonBase} bg-violet-950 text-white hover:bg-violet-700`}
            >
              {replyPending ? "Sending…" : "Send reply"}
            </button>
          </form>
          {replyState.message ? (
            <p
              className={`mt-3 text-sm ${replyState.status === "error" ? "text-red-700" : "text-emerald-700"}`}
            >
              {replyState.message}
            </p>
          ) : null}
        </section>
      ) : null}

      {/* ---- notes ---- */}
      <section className="rounded-[16px] border border-line bg-white p-5">
        <h2 className="mb-3 text-sm font-bold">Internal notes</h2>
        <form action={notesAction} className="grid gap-3">
          <input type="hidden" name="id" value={id} />
          <textarea
            name="notes"
            rows={4}
            defaultValue={notes ?? ""}
            placeholder="Only visible in the admin."
            className="w-full rounded-[11px] border border-line bg-[#fcfbff] px-4 py-3 text-sm outline-none focus:border-violet-400 focus:ring-[3px] focus:ring-violet-100"
          />
          <button
            type="submit"
            disabled={notesPending}
            className={`${buttonBase} border border-line bg-white hover:border-violet-200 hover:text-violet-700`}
          >
            {notesPending ? "Saving…" : "Save notes"}
          </button>
        </form>
        {notesState.message ? (
          <p
            className={`mt-3 text-sm ${notesState.status === "error" ? "text-red-700" : "text-emerald-700"}`}
          >
            {notesState.message}
          </p>
        ) : null}
      </section>

      {/* ---- delete ---- */}
      {canDelete ? (
        <section className="rounded-[16px] border border-red-200 bg-red-50/50 p-5">
          <h2 className="mb-2 text-sm font-bold text-red-900">Delete lead</h2>
          <p className="mb-3 text-sm text-red-800">
            Permanent. There is no undo for a deleted enquiry.
          </p>
          <form action={deleteAction}>
            <input type="hidden" name="id" value={id} />
            <button
              type="submit"
              disabled={deletePending}
              className={`${buttonBase} border border-red-300 bg-white text-red-800 hover:bg-red-100`}
            >
              {deletePending ? "Deleting…" : "Delete permanently"}
            </button>
          </form>
          {deleteState.message ? (
            <p className="mt-3 text-sm text-red-800">{deleteState.message}</p>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
