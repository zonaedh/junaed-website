"use client";

import { useActionState } from "react";
import {
  addRedirect,
  clearNotFound,
  dismissNotFound,
  removeRedirect,
  toggleRedirect,
  type SeoActionState,
} from "./actions";

const idle: SeoActionState = { status: "idle" };

const buttonBase =
  "inline-flex items-center justify-center rounded-[10px] px-3.5 py-2 text-sm font-semibold transition disabled:opacity-60";

const inputBase =
  "w-full rounded-[10px] border border-line bg-white px-3 py-2 text-sm outline-none focus:border-violet-400";

function Feedback({ state }: { state: SeoActionState }) {
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

/** Add-redirect form. */
export function AddRedirectForm() {
  const [state, action, pending] = useActionState(addRedirect, idle);

  return (
    <form action={action} className="rounded-[14px] border border-line bg-white p-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto]">
        <div>
          <label htmlFor="fromPath" className="mb-1 block text-xs font-bold">
            Old path
          </label>
          <input
            id="fromPath"
            name="fromPath"
            placeholder="/old-page"
            required
            className={inputBase}
          />
        </div>
        <div>
          <label htmlFor="toPath" className="mb-1 block text-xs font-bold">
            Redirects to
          </label>
          <input
            id="toPath"
            name="toPath"
            placeholder="/new-page or https://…"
            required
            className={inputBase}
          />
        </div>
        <div>
          <label htmlFor="code" className="mb-1 block text-xs font-bold">
            Code
          </label>
          <select id="code" name="code" defaultValue="301" className={inputBase}>
            <option value="301">Permanent (308)</option>
            <option value="302">Temporary (307)</option>
          </select>
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={pending}
            className={`${buttonBase} bg-violet-950 text-white hover:bg-violet-800`}
          >
            {pending ? "Adding…" : "Add redirect"}
          </button>
        </div>
      </div>
      <Feedback state={state} />
    </form>
  );
}

/** Enable/disable and delete controls for one redirect row. */
export function RedirectRowControls({
  id,
  isActive,
}: {
  id: number;
  isActive: boolean;
}) {
  const [toggleState, toggleAction, togglePending] = useActionState(
    toggleRedirect,
    idle,
  );
  const [removeState, removeAction, removePending] = useActionState(
    removeRedirect,
    idle,
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      <form action={toggleAction}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="isActive" value={String(!isActive)} />
        <button
          type="submit"
          disabled={togglePending}
          className={`${buttonBase} border border-line hover:bg-violet-50`}
        >
          {isActive ? "Disable" : "Enable"}
        </button>
      </form>
      <form action={removeAction}>
        <input type="hidden" name="id" value={id} />
        <button
          type="submit"
          disabled={removePending}
          className={`${buttonBase} border border-red-200 text-red-700 hover:bg-red-50`}
        >
          Delete
        </button>
      </form>
      {toggleState.status === "error" && toggleState.message ? (
        <span className="text-xs font-semibold text-red-700">
          {toggleState.message}
        </span>
      ) : null}
      {removeState.status === "error" && removeState.message ? (
        <span className="text-xs font-semibold text-red-700">
          {removeState.message}
        </span>
      ) : null}
    </div>
  );
}

/** One-click "create a redirect from this 404" action. */
export function NotFoundRowControls({
  id,
  path,
}: {
  id: number;
  path: string;
}) {
  const [dismissState, dismissAction, dismissPending] = useActionState(
    dismissNotFound,
    idle,
  );
  const [addState, addAction, addPending] = useActionState(addRedirect, idle);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <form action={addAction} className="flex items-center gap-2">
        <input type="hidden" name="fromPath" value={path} />
        <input type="hidden" name="code" value="301" />
        <input
          name="toPath"
          placeholder="/where-it-should-go"
          required
          className="w-44 rounded-[10px] border border-line bg-white px-2.5 py-1.5 text-xs outline-none focus:border-violet-400"
        />
        <button
          type="submit"
          disabled={addPending}
          className={`${buttonBase} bg-violet-950 px-3 py-1.5 text-xs text-white hover:bg-violet-800`}
        >
          {addPending ? "Adding…" : "Redirect it"}
        </button>
      </form>
      <form action={dismissAction}>
        <input type="hidden" name="id" value={id} />
        <button
          type="submit"
          disabled={dismissPending}
          className={`${buttonBase} border border-line px-3 py-1.5 text-xs hover:bg-violet-50`}
        >
          Dismiss
        </button>
      </form>
      {addState.status === "success" ? (
        <span className="text-xs font-semibold text-emerald-700">
          {addState.message}
        </span>
      ) : null}
      {addState.status === "error" && addState.message ? (
        <span className="text-xs font-semibold text-red-700">
          {addState.message}
        </span>
      ) : null}
      {dismissState.status === "error" && dismissState.message ? (
        <span className="text-xs font-semibold text-red-700">
          {dismissState.message}
        </span>
      ) : null}
    </div>
  );
}

/** Clear the whole 404 log. Owner/Admin only; the button is hidden otherwise. */
export function ClearNotFoundButton() {
  const [state, action, pending] = useActionState(clearNotFound, idle);

  return (
    <div>
      <form action={action}>
        <button
          type="submit"
          disabled={pending}
          className={`${buttonBase} border border-red-200 text-red-700 hover:bg-red-50`}
        >
          {pending ? "Clearing…" : "Clear log"}
        </button>
      </form>
      <Feedback state={state} />
    </div>
  );
}
