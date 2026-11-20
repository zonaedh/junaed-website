"use client";

import { useActionState, useEffect, useState } from "react";
import { confirmTwoFactor, type TwoFactorState } from "./actions";

const initialState: TwoFactorState = { status: "idle" };

/**
 * QR code is rendered client-side from the otpauth:// URI using the `qrcode`
 * package, so the secret never has to be sent to a third-party QR service.
 */
export function TwoFactorSetup({ otpauthUrl }: { otpauthUrl: string }) {
  const [state, formAction, pending] = useActionState(
    confirmTwoFactor,
    initialState,
  );
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrError, setQrError] = useState(false);

  // Generate the QR once, lazily, on the client. Rendering it here rather than
  // on the server keeps the secret out of any third-party QR service.
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const QRCode = await import("qrcode");
        const url = await QRCode.toDataURL(otpauthUrl, {
          margin: 1,
          width: 220,
          color: { dark: "#271164", light: "#ffffff" },
        });
        if (!cancelled) setQrDataUrl(url);
      } catch {
        if (!cancelled) setQrError(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [otpauthUrl]);

  if (state.status === "confirmed") {
    return (
      <div className="rounded-[18px] border border-line bg-white p-6">
        <p className="flex items-center gap-2 text-sm font-bold text-[#1f9d63]">
          <span aria-hidden="true">✓</span> {state.message}
        </p>

        <div className="mt-5 rounded-xl border border-amber-300 bg-amber-50 p-4">
          <p className="text-sm font-bold text-amber-900">
            Save these recovery codes now
          </p>
          <p className="mt-1 text-xs leading-[1.6] text-amber-900/80">
            Each code works once if you lose your authenticator. They are shown
            only this time and cannot be retrieved later.
          </p>
          <ul className="mt-3 grid grid-cols-2 gap-1.5">
            {state.recoveryCodes?.map((code) => (
              <li
                key={code}
                className="rounded-md bg-white px-2 py-1.5 font-mono text-xs text-ink"
              >
                {code}
              </li>
            ))}
          </ul>
        </div>

        <a
          href="/dashboard"
          className="mt-5 inline-flex min-h-11 items-center rounded-lg bg-violet-950 px-5 text-sm font-bold text-white transition hover:bg-violet-700"
        >
          Continue to dashboard
        </a>
      </div>
    );
  }

  return (
    <div className="rounded-[18px] border border-line bg-white p-6">
      <ol className="space-y-5">
        <li>
          <p className="mb-2 text-sm font-bold">
            1. Scan this code with your authenticator app
          </p>
          <div className="inline-flex rounded-xl border border-line bg-white p-3">
            {qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- data URL, not a remote asset
              <img
                src={qrDataUrl}
                alt="QR code for two-factor authentication setup"
                width={220}
                height={220}
              />
            ) : (
              <div className="grid size-[220px] place-items-center text-center text-xs text-muted">
                {qrError
                  ? "Could not render the QR code. Use the manual key below."
                  : "Generating QR code…"}
              </div>
            )}
          </div>
        </li>

        <li>
          <p className="mb-1.5 text-sm font-bold">
            2. Enter the 6-digit code it shows
          </p>
          <form action={formAction} className="space-y-3">
            {state.status === "error" && state.message ? (
              <div
                role="alert"
                className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
              >
                {state.message}
              </div>
            ) : null}

            <input
              name="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              aria-label="6-digit authentication code"
              className="w-full max-w-[220px] rounded-[11px] border border-line bg-[#fcfbff] px-4 py-3 text-center text-lg tracking-[0.3em] outline-none focus:border-violet-400 focus:ring-[3px] focus:ring-violet-100"
              placeholder="000000"
            />

            <button
              type="submit"
              disabled={pending}
              className="flex min-h-11 w-full items-center justify-center rounded-[11px] bg-violet-950 px-5 text-sm font-bold text-white transition hover:bg-violet-700 disabled:pointer-events-none disabled:opacity-60 sm:w-auto"
            >
              {pending ? "Verifying…" : "Verify and enable"}
            </button>
          </form>
        </li>
      </ol>
    </div>
  );
}
