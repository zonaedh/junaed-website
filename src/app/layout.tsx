import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import "./globals.css";
import { buildRootMetadata } from "@/lib/seo/metadata";

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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${manrope.variable}`}>
      <body className="min-h-dvh bg-white text-ink antialiased">{children}</body>
    </html>
  );
}
