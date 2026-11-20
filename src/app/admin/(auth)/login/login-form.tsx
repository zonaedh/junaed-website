"use client";

import { useActionState, useRef, useState } from "react";
import { login } from "./actions";
import type { LoginState } from "@/lib/validation/auth";

const initialState: LoginState = { status: "idle" };

const fieldClass =
  "w-full rounded-[11px] border border-line bg-[#fcfbff] px-4 py-[13px] text-[15px] outline-none transition placeholder:text-muted/70 focus:border-violet-400 focus:ring-[3px] focus:ring-violet-100";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState);
  // Once the server says "totp_required" we reveal the code field and keep
  // the email the user already typed.
  const [email, setEmail] = useState("");
  const codeRef = useRef<HTMLInputElement>(null);

  const needsTotp = state.status === "totp_required";

  return (
    <form action={formAction} className="space-y-4">
      {state.status === "error" && state.message ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-[1.5] text-red-800"
        >
          {state.message}
        </div>
      ) : null}

      {needsTotp && state.message ? (
        <div
          role="alert"
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-[1.5] text-amber-900"
        >
          {state.message}
        </div>
      ) : null}

      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-bold">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          readOnly={needsTotp}
          value={needsTotp ? (state.email ?? email) : email}
          onChange={(event) => setEmail(event.target.value)}
          className={`${fieldClass} ${needsTotp ? "text-muted" : ""}`}
          placeholder="you@junaedhossain.com"
        />
      </div>

      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-bold">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={fieldClass}
          placeholder="••••••••••••"
        />
      </div>

      {needsTotp ? (
        <div>
          <label htmlFor="totp" className="mb-1.5 block text-sm font-bold">
            Authentication code
          </label>
          <input
            ref={codeRef}
            id="totp"
            name="totp"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            autoFocus
            className={`${fieldClass} tracking-[0.3em]`}
            placeholder="000000"
          />
          <p className="mt-1.5 text-xs text-muted">
            Open your authenticator app and enter the current 6-digit code.
          </p>
        </div>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-12 w-full items-center justify-center rounded-[11px] bg-violet-950 px-5 py-3.5 text-[15px] font-bold text-white transition hover:bg-violet-700 disabled:pointer-events-none disabled:opacity-60"
      >
        {pending ? "Checking…" : needsTotp ? "Verify and sign in" : "Sign in"}
      </button>

      <p className="text-center text-xs leading-[1.6] text-muted">
        Forgot your password? Ask the owner to send a reset link.
      </p>
    </form>
  );
}
