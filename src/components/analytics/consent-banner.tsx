"use client";

import Link from "next/link";
import { useCallback, useSyncExternalStore } from "react";
import {
  CONSENT_COOKIE,
  CONSENT_VERSION,
  parseConsent,
  serializeConsent,
  type ConsentChoice,
} from "@/lib/analytics/core";

/**
 * Cookie consent banner (MVP.md §7.1).
 *
 * Three rules that make this actually compliant rather than decorative:
 *
 *  1. Nothing is assumed. The banner shows until the visitor answers, and an
 *     unrecognised or outdated cookie counts as "unset" — never as consent.
 *  2. Rejecting is as easy as accepting. Same size, same position, one click.
 *  3. The choice is broadcast. A `jh:consent` window event fires so the tracker
 *     and any tag loader can react without polling the cookie.
 *
 * The cookie is written client-side because consent has to be recorded even if
 * the request never reaches the server, and it is not a security boundary.
 */

const ONE_YEAR = 60 * 60 * 24 * 365;

function readConsentCookie(): ConsentChoice {
  if (typeof document === "undefined") return "unset";
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${CONSENT_COOKIE}=`));
  if (!match) return "unset";
  return parseConsent(decodeURIComponent(match.split("=")[1] ?? ""));
}

/**
 * The cookie is an external store, so it is read through `useSyncExternalStore`
 * rather than mirrored into state inside an effect. The server snapshot is
 * always "unset", and `mounted` is false on the server, which is what keeps the
 * banner from flashing for a visitor who already answered.
 */
function subscribeToConsent(onChange: () => void) {
  window.addEventListener("jh:consent", onChange);
  return () => window.removeEventListener("jh:consent", onChange);
}

const subscribeToNothing = () => () => {};
const clientMounted = () => true;
const serverMounted = () => false;
const serverChoice = () => "unset" as ConsentChoice;

export function ConsentBanner() {
  const choice = useSyncExternalStore(
    subscribeToConsent,
    readConsentCookie,
    serverChoice,
  );
  const mounted = useSyncExternalStore(
    subscribeToNothing,
    clientMounted,
    serverMounted,
  );

  const decide = useCallback((next: Exclude<ConsentChoice, "unset">) => {
    document.cookie = `${CONSENT_COOKIE}=${encodeURIComponent(
      serializeConsent(next),
    )}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
    window.dispatchEvent(
      new CustomEvent("jh:consent", { detail: { choice: next, version: CONSENT_VERSION } }),
    );
  }, []);

  // Nothing renders until the cookie has been read, so the banner never flashes
  // for a visitor who already answered.
  if (!mounted || choice !== "unset") return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      aria-live="polite"
      className="fixed inset-x-3 bottom-3 z-90 mx-auto max-w-[720px] rounded-[16px] border border-line bg-white p-4 shadow-[0_14px_40px_rgba(37,56,88,0.16)] sm:inset-x-6 sm:bottom-6 sm:p-5"
    >
      <p className="text-sm font-bold">Cookies and analytics</p>
      <p className="mt-1 text-[13px] leading-[1.65] text-muted">
        I use first-party analytics to see which pages are useful. Nothing is
        shared with advertisers, and no raw IP address is stored. You can say no
        and the site works exactly the same.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => decide("accepted")}
          className="inline-flex min-h-10 items-center rounded-[10px] bg-violet-950 px-4 text-sm font-semibold text-white transition hover:bg-violet-800"
        >
          Accept
        </button>
        <button
          type="button"
          onClick={() => decide("rejected")}
          className="inline-flex min-h-10 items-center rounded-[10px] border border-line px-4 text-sm font-semibold transition hover:bg-violet-50"
        >
          Reject
        </button>
        <Link
          href="/privacy-policy"
          className="inline-flex min-h-10 items-center px-2 text-sm font-semibold text-violet-700 hover:underline"
        >
          Read the policy
        </Link>
      </div>
    </div>
  );
}