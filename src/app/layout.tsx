import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import "./globals.css";

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

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://junaedhossain.com",
  ),
  title: {
    default: "Junaed Hossain — Digital Growth & Creative Solutions",
    template: "%s | Junaed Hossain",
  },
  description:
    "Junaed Hossain — Digital marketing, SEO, graphic design and WordPress customization. Helping brands build a stronger digital presence.",
  applicationName: "Junaed Hossain",
  authors: [{ name: "Junaed Hossain" }],
  creator: "Junaed Hossain",
  formatDetection: { telephone: false, address: false, email: false },
};

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
