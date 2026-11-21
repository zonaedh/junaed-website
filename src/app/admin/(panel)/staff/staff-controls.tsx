"use client";

import { useActionState, useState } from "react";
import {
  addStaff,
  changeRole,
  forcePasswordReset,
  removeStaff,
  resetTotp,
  revokeSessions,
  toggleActive,
  type StaffState,
} from "./actions";

const idle: StaffState = { status: "idle" };

const field =
  "w-full rounded-[10px] border border-line bg-white px-3 py-2 text-sm outline-none focus:border-violet-400";

const buttonBase =
  "inline-flex items-center justify-center rounded-[10px] px-3 py-1.5 text-xs font-semibold transition disabled:opacity-60";

function Feedback({ state }: { state: StaffState }) {
  if (state.status === "idle" || !state.message) return null;
  return (
    <p
      role="status"
      className={
        state.status === "success"
          ? "mt-2 text-xs font-semibold text-emerald-700"
          : "mt-2 text-xs font-semibold text-red-700"
      }
    >
      {state.message}
    </p>
  );
}

export function AddStaffForm({ roles }: { roles: string[] }) {
  const [state, action, pending] = useActionState(addStaff, idle);

  return (
    <form action={action} className="rounded-[14px] border border-line bg-white p-4">
      <h2 className="mb-3 text-sm font-bold">Add a staff account</h2>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="mb-1 block text-xs font-bold">
            Name
          </label>
          <input id="name" name="name" required className={field} placeholder="Full name" />
        </div>
        <div>
          <label htmlFor="email" className="mb-1 block text-xs font-bold">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className={field}
            placeholder="name@example.com"
          />
        </div>
        <div>
          <label htmlFor="role" className="mb-1 block text-xs font-bold">
            Role
          </label>
          <select id="role" name="role" defaultValue="editor" className={field}>
            {roles.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="password" className="mb-1 block text-xs font-bold">
            Initial password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="new-password"
            className={field}
            placeholder="At least 12 characters"
          />
        </div>
      </div>

      <p className="mt-2 text-[11px] text-muted">
        Invites are sent by a channel you control: this creates the account with a
        password you set. Email delivery needs Resend configured, which it is not
        yet, so no invitation email is sent.
      </p>

      <div className="mt-3">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center rounded-[10px] bg-violet-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-800 disabled:opacity-60"
        >
          {pending ? "Creating…" : "Create account"}
        </button>
      </div>
      <Feedback state={state} />
    </form>
  );
}

export function StaffRowControls({
  id,
  name,
  role,
  isActive,
  totpEnabled,
  sessionCount,
  roles,
  canManage,
  canResetTotp,
}: {
  id: number;
  name: string;
  role: string;
  isActive: boolean;
  totpEnabled: boolean;
  sessionCount: number;
  roles: string[];
  canManage: boolean;
  canResetTotp: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [roleState, roleAction, rolePending] = useActionState(changeRole, idle);
  const [activeState, activeAction, activePending] = useActionState(toggleActive, idle);
  const [resetState, resetAction, resetPending] = useActionState(forcePasswordReset, idle);
  const [revokeState, revokeAction, revokePending] = useActionState(revokeSessions, idle);
  const [removeState, removeAction, removePending] = useActionState(removeStaff, idle);
  const [totpState, totpAction, totpPending] = useActionState(resetTotp, idle);

  return (
    <div className="rounded-[12px] border border-line bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 p-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">
            {name}
            {!isActive ? (
              <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                inactive
              </span>
            ) : null}
          </p>
          <p className="text-[11px] text-muted">
            {role} · {totpEnabled ? "2FA on" : "2FA off"} · {sessionCount} session
            {sessionCount === 1 ? "" : "s"}
          </p>
        </div>

        {canManage ? (
          <button
            type="button"
            onClick={() => setOpen((value) => !value)}
            className={`${buttonBase} border border-line hover:bg-violet-50`}
          >
            {open ? "Close" : "Manage"}
          </button>
        ) : (
          <span className="text-[11px] text-muted">Read only</span>
        )}
      </div>

      {open && canManage ? (
        <div className="space-y-3 border-t border-line p-3">
          {/* Role */}
          <form action={roleAction} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="id" value={id} />
            <div className="min-w-[140px] flex-1">
              <label htmlFor={`role-${id}`} className="mb-1 block text-xs font-bold">
                Role
              </label>
              <select id={`role-${id}`} name="role" defaultValue={role} className={field}>
                {roles.map((entry) => (
                  <option key={entry} value={entry}>
                    {entry}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={rolePending}
              className={`${buttonBase} bg-violet-950 text-white hover:bg-violet-800`}
            >
              {rolePending ? "Saving…" : "Save role"}
            </button>
          </form>
          <Feedback state={roleState} />

          {/* Activate / deactivate */}
          <form action={activeAction} className="flex items-center gap-2">
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="isActive" value={String(!isActive)} />
            <button
              type="submit"
              disabled={activePending}
              className={`${buttonBase} border border-line hover:bg-violet-50`}
            >
              {activePending ? "…" : isActive ? "Deactivate" : "Reactivate"}
            </button>
            <span className="text-[11px] text-muted">
              {isActive ? "Ends their sessions immediately." : "Allows sign-in again."}
            </span>
          </form>
          <Feedback state={activeState} />

          {/* Force password reset */}
          <form action={resetAction} className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="id" value={id} />
            <div className="min-w-[180px] flex-1">
              <label htmlFor={`pw-${id}`} className="mb-1 block text-xs font-bold">
                Set a new password
              </label>
              <input
                id={`pw-${id}`}
                name="password"
                type="password"
                autoComplete="new-password"
                className={field}
                placeholder="At least 12 characters"
              />
            </div>
            <button
              type="submit"
              disabled={resetPending}
              className={`${buttonBase} border border-line hover:bg-violet-50`}
            >
              {resetPending ? "…" : "Reset password"}
            </button>
          </form>
          <Feedback state={resetState} />

          {/* Sessions */}
          <form action={revokeAction} className="flex items-center gap-2">
            <input type="hidden" name="id" value={id} />
            <button
              type="submit"
              disabled={revokePending || sessionCount === 0}
              className={`${buttonBase} border border-line hover:bg-violet-50`}
            >
              {revokePending ? "…" : "Revoke sessions"}
            </button>
            <span className="text-[11px] text-muted">
              Signs them out everywhere without changing the password.
            </span>
          </form>
          <Feedback state={revokeState} />

          {/* 2FA reset */}
          {canResetTotp ? (
            <>
              <form action={totpAction} className="flex items-center gap-2">
                <input type="hidden" name="id" value={id} />
                <button
                  type="submit"
                  disabled={totpPending || !totpEnabled}
                  className={`${buttonBase} border border-line hover:bg-violet-50`}
                >
                  {totpPending ? "…" : "Reset 2FA"}
                </button>
                <span className="text-[11px] text-muted">
                  For a lost device. They re-enrol at next sign-in.
                </span>
              </form>
              <Feedback state={totpState} />
            </>
          ) : null}

          {/* Delete */}
          <form action={removeAction} className="flex items-center gap-2 border-t border-line pt-3">
            <input type="hidden" name="id" value={id} />
            <button
              type="submit"
              disabled={removePending}
              className={`${buttonBase} border border-red-200 text-red-700 hover:bg-red-50`}
            >
              {removePending ? "…" : "Delete account"}
            </button>
            <span className="text-[11px] text-muted">
              Permanent. Their activity log entries are kept.
            </span>
          </form>
          <Feedback state={removeState} />
        </div>
      ) : null}
    </div>
  );
}
