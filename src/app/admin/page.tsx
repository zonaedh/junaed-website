import type { Metadata } from "next";

/**
 * PHASE 1 PLACEHOLDER.
 *
 * This route exists so the admin host has something to serve and so the
 * noindex header can be verified end-to-end before the real admin exists.
 * Phase 2 replaces this file with the login screen and the admin shell.
 *
 * Note: `proxy.ts` already sends `X-Robots-Tag: noindex, nofollow, noarchive,
 * nosnippet` for every admin-host response. The meta tag below is the second
 * layer, not the only one.
 */

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminPlaceholderPage() {
  return (
    <main className="grid min-h-dvh place-items-center bg-violet-950 px-6 text-white">
      <div className="w-full max-w-md rounded-[24px] border border-white/12 bg-white/6 p-8">
        <p className="text-xs font-bold tracking-[0.11em] text-violet-300 uppercase">
          Admin panel
        </p>
        <h1 className="mt-3 mb-3 font-display text-2xl font-extrabold tracking-[-0.04em]">
          Not built yet.
        </h1>
        <p className="text-[15px] leading-[1.7] text-violet-200">
          This host is reserved for the private admin panel. Authentication,
          the dashboard and content management arrive in Phase 2. Nothing here
          is public, and this host is excluded from search engines at the
          header level.
        </p>
        <p className="mt-6 text-xs text-violet-300/70">
          Phase 1 placeholder — no data, no login, no routes.
        </p>
      </div>
    </main>
  );
}
