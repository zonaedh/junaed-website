/**
 * Site-wide configuration and navigation.
 *
 * Phase 1: static. Phase 3 replaces these values with rows from the
 * `settings` and `menu_items` tables (see MVP.md §3.3).
 */

export const site = {
  name: "Junaed Hossain",
  shortName: "JH",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://junaedhossain.com",
  adminUrl: process.env.ADMIN_URL ?? "https://admin.junaedhossain.com",
  title: "Junaed Hossain — Digital Growth & Creative Solutions",
  description:
    "Junaed Hossain — Digital marketing, SEO, graphic design and WordPress customization. Helping brands build a stronger digital presence.",
  tagline: "Digital solutions for growing brands",
  email: "hello@junaedhossain.com",
  themeColor: "#271164",
} as const;

export type NavItem = { label: string; href: string };

export const mainNav: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "Services", href: "/services" },
  { label: "Portfolio", href: "/portfolio" },
  { label: "About", href: "/about" },
  { label: "Blog", href: "/blog" },
  { label: "Contact", href: "/contact" },
];

export const footerNav: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "Services", href: "/services" },
  { label: "Portfolio", href: "/portfolio" },
  { label: "About", href: "/about" },
  { label: "Blog", href: "/blog" },
  { label: "Contact", href: "/contact" },
];

export const legalNav: NavItem[] = [
  { label: "Privacy Policy", href: "/privacy-policy" },
  { label: "Terms", href: "/terms" },
];
