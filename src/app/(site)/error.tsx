"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Route-level error boundary for the public site.
 * `digest` is the only detail Next.js exposes in production; the full error
 * is logged server-side by the framework.
 */
export default function SiteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[site] unhandled error", error);
  }, [error]);

  return (
    <section className="py-20 lg:py-28">
      <div className="wrap max-w-[620px] text-center">
        <p className="text-xs font-bold tracking-[0.11em] text-violet-700 uppercase">
          Something broke
        </p>
        <h1 className="mt-5 mb-4 text-[clamp(2rem,4.5vw,3rem)] leading-[1.1] tracking-[-0.045em]">
          That didn&rsquo;t load properly.
        </h1>
        <p className="mx-auto max-w-[440px] text-[17px] leading-[1.75] text-muted">
          The page hit an unexpected error. Trying again usually works. If it
          keeps happening, please get in touch.
        </p>
        {error.digest ? (
          <p className="mt-4 font-mono text-xs text-muted">
            Reference: {error.digest}
          </p>
        ) : null}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex min-h-11 items-center justify-center rounded-[13px] bg-violet-950 px-5 py-3.5 text-[15px] font-bold text-white transition hover:bg-violet-700"
          >
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center justify-center rounded-[13px] border border-line bg-white px-5 py-3.5 text-[15px] font-bold text-violet-950 transition hover:bg-violet-50"
          >
            Back to home
          </Link>
        </div>
      </div>
    </section>
  );
}
