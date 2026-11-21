import type { Metadata } from "next";
import { headers } from "next/headers";
import { Inter, Manrope } from "next/font/google";
import "./globals.css";
import { buildRootMetadata } from "@/lib/seo/metadata";
import { CustomScripts } from "@/components/analytics/custom-scripts";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-manrope",
});

/**
 * Root metadata is database-driven from Phase 6 (MVP.md §6.1).
 *
 * The title template, default description, social card and verification codes
 * all come from Settings → SEO, so the owner can change them without a deploy.
 * `metadataBase` comes from the same place, which is what makes the relative
 * canonical and OG image paths on child pages resolve to absolute URLs.
 */
export async function generateMetadata(): Promise<Metadata> {
  return buildRootMetadata();
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Head snippets belong in <head>, which only the root layout owns. The
  // admin tree must never receive them, so the path is checked here rather
  // than trusting the snippet's own scope.
  const pathname = (await headers()).get("x-pathname") ?? "/";
  const isAdmin = pathname.startsWith("/admin");

  return (
    <html lang="en" className={`${inter.variable} ${manrope.variable}`}>
      <head>{isAdmin ? null : <CustomScripts pathname={pathname} location="head" />}</head>
      <body className="min-h-dvh bg-white text-ink antialiased">{children}</body>
    </html>
  );
}
