"use client";

import { useActionState } from "react";
import { createBlock, deleteBlock, type BlockState } from "./actions";

const idle: BlockState = { status: "idle" };

const field =
  "w-full rounded-[10px] border border-line bg-white px-3 py-2 text-sm outline-none focus:border-violet-400";

const buttonBase =
  "inline-flex items-center justify-center rounded-[10px] px-3.5 py-2 text-sm font-semibold transition disabled:opacity-60";

function Feedback({ state }: { state: BlockState }) {
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

export function AddBlockForm() {
  const [state, action, pending] = useActionState(createBlock, idle);

  return (
    <form action={action} className="rounded-[14px] border border-line bg-white p-4">
      <h2 className="mb-3 text-sm font-bold">Block an address</h2>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="ip" className="mb-1 block text-xs font-bold">
            IP or CIDR
          </label>
          <input
            id="ip"
            name="ip"
            required
            className={field}
            placeholder="203.0.113.5 or 203.0.113.0/24"
          />
        </div>
        <div>
          <label htmlFor="expiresAt" className="mb-1 block text-xs font-bold">
            Expires (optional)
          </label>
          <input id="expiresAt" name="expiresAt" type="date" className={field} />
        </div>
      </div>

      <div className="mt-3">
        <label htmlFor="reason" className="mb-1 block text-xs font-bold">
          Reason
        </label>
        <input
          id="reason"
          name="reason"
          className={field}
          placeholder="Repeated spam submissions"
        />
        <p className="mt-1 text-[11px] text-muted">
          Recorded in the activity log. Worth writing for your future self.
        </p>
      </div>

      <div className="mt-3">
        <button
          type="submit"
          disabled={pending}
          className={`${buttonBase} bg-violet-950 text-white hover:bg-violet-800`}
        >
          {pending ? "Blocking…" : "Block address"}
        </button>
      </div>
      <Feedback state={state} />
    </form>
  );
}

export function RemoveBlockButton({ id, ip }: { id: number; ip: string }) {
  const [state, action, pending] = useActionState(deleteBlock, idle);

  return (
    <form action={action} className="inline-flex flex-col items-end">
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        disabled={pending}
        aria-label={`Unblock ${ip}`}
        className="inline-flex items-center rounded-[8px] border border-line px-2.5 py-1 text-[11px] font-semibold transition hover:bg-violet-50 disabled:opacity-60"
      >
        {pending ? "…" : "Unblock"}
      </button>
      {state.status === "error" && state.message ? (
        <span className="mt-1 text-[10px] font-semibold text-red-700">{state.message}</span>
      ) : null}
    </form>
  );
}
