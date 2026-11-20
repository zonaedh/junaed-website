import type { Metadata } from "next";

/**
 * Admin root layout.
 *
 * The noindex protection is layered (D-012):
 *  1. `X-Robots-Tag` header from src/proxy.ts — the one that actually works.
 *  2. The meta tag below.
 *  3. `Disallow: /` robots.txt served by the proxy for this host.
 *
 * This layout must never be used by the public site. It lives under /admin,
 * which the proxy 404s on the public host.
 */

export const metadata: Metadata = {
  title: {
    default: "Admin",
    template: "%s · Admin",
  },
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
};

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="min-h-dvh bg-[#f6f5fa] text-ink">{children}</div>;
}
