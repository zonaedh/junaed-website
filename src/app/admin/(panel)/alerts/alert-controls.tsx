"use client";

import { useActionState } from "react";
import { readAlert, readAllAlerts, type AlertActionState } from "./actions";

const idle: AlertActionState = { status: "idle" };

export function MarkAllReadButton({ disabled }: { disabled: boolean }) {
  const [state, action, pending] = useActionState(readAllAlerts, idle);

  return (
    <div>
      <form action={action}>
        <button
          type="submit"
          disabled={pending || disabled}
          className="inline-flex items-center rounded-[10px] border border-line px-3 py-1.5 text-xs font-semibold transition hover:bg-violet-50 disabled:opacity-60"
        >
          {pending ? "Marking…" : "Mark all read"}
        </button>
      </form>
      {state.status === "success" && state.message ? (
        <p className="mt-1 text-[11px] font-semibold text-emerald-700">{state.message}</p>
      ) : null}
    </div>
  );
}

export function MarkReadButton({ id }: { id: number }) {
  const [state, action, pending] = useActionState(readAlert, idle);

  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        disabled={pending}
        className="text-[11px] font-bold text-violet-700 hover:underline disabled:opacity-60"
      >
        {pending ? "…" : "Mark read"}
      </button>
      {state.status === "error" && state.message ? (
        <span className="ml-2 text-[11px] text-red-700">{state.message}</span>
      ) : null}
    </form>
  );
}