"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState, type ReactNode } from "react";
import type { SessionUser } from "@/lib/auth/session";
import { ROLE_LABELS } from "@/lib/role-hierarchy";
import { logout } from "@/app/admin/(auth)/login/actions";

/**
 * Admin shell: collapsible sidebar, topbar, mobile drawer.
 *
 * Navigation is grouped by intent, not by database table. Items the current
 * role cannot use are hidden — but hiding is cosmetic; the server-side
 * requireRole() in each page is the real control.
 */

type NavItem = {
  href: string;
  label: string;
  icon: string;
  /** Minimum role, mirrored from the page's own requireRole call. */
  role?: "support" | "editor" | "admin" | "owner";
};

type NavGroup = { title: string; items: NavItem[] };

const NAV: NavGroup[] = [
  {
    title: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: "◫" },
      { href: "/activity", label: "Activity", icon: "≡", role: "admin" },
    ],
  },
  {
    title: "Content",
    items: [
      { href: "/pages", label: "Pages", icon: "▤", role: "editor" },
      { href: "/posts", label: "Posts", icon: "✎", role: "editor" },
      { href: "/portfolio", label: "Portfolio", icon: "◈", role: "editor" },
      { href: "/services", label: "Services", icon: "⌘", role: "editor" },
      { href: "/media", label: "Media", icon: "▣", role: "editor" },
    ],
  },
  {
    title: "Growth",
    items: [
      { href: "/leads", label: "Leads", icon: "✉", role: "support" },
      { href: "/analytics", label: "Analytics", icon: "◔", role: "admin" },
      { href: "/seo", label: "SEO", icon: "⌕", role: "editor" },
    ],
  },
  {
    title: "System",
    items: [
      { href: "/settings", label: "Settings", icon: "⚙", role: "admin" },
      { href: "/staff", label: "Staff", icon: "☰", role: "owner" },
      { href: "/security", label: "Security", icon: "⛨", role: "owner" },
      { href: "/backups", label: "Backups", icon: "⤓", role: "owner" },
    ],
  },
];

const RANK: Record<string, number> = { support: 1, editor: 2, admin: 3, owner: 4 };

function canSee(userRole: string, required?: string): boolean {
  if (!required) return true;
  return (RANK[userRole] ?? 0) >= (RANK[required] ?? 99);
}

export function AdminShell({
  user,
  children,
}: {
  user: SessionUser;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const drawerId = useId();

  /**
   * The nav hrefs are written for the admin host, where the proxy rewrites
   * `/settings` into the admin tree. On loopback there is no rewrite, so the
   * panel lives under `/admin/...` and every link would 404 (D-024).
   *
   * Detecting it from the pathname is reliable here: the only way to reach an
   * admin route on loopback is through the `/admin` prefix, and on the admin
   * host the pathname never carries it.
   */
  const basePath = pathname.startsWith("/admin") ? "/admin" : "";
  const toAdminHref = (href: string) => `${basePath}${href}`;

  useEffect(() => {
    if (!mobileOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMobileOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const sidebar = (
    <nav aria-label="Admin navigation" className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2.5 border-b border-line px-4">
        <span
          aria-hidden="true"
          className="grid size-9 shrink-0 place-items-center rounded-[11px] bg-linear-145 from-violet-500 to-violet-950 text-sm font-extrabold text-white"
        >
          J
        </span>
        {!collapsed ? (
          <span className="font-display text-sm font-extrabold tracking-[-0.03em]">
            Junaed Hossain
          </span>
        ) : null}
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-4">
        {NAV.map((group) => {
          const items = group.items.filter((item) => canSee(user.role, item.role));
          if (items.length === 0) return null;

          return (
            <div key={group.title} className="mb-5">
              {!collapsed ? (
                <p className="mb-1.5 px-3 text-[10px] font-bold tracking-[0.12em] text-muted uppercase">
                  {group.title}
                </p>
              ) : null}
              <ul className="space-y-0.5">
                {items.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={toAdminHref(item.href)}
                        aria-current={active ? "page" : undefined}
                        onClick={() => setMobileOpen(false)}
                        title={collapsed ? item.label : undefined}
                        className={`flex min-h-10 items-center gap-2.5 rounded-lg px-3 text-sm font-semibold transition-colors ${
                          active
                            ? "bg-violet-950 text-white"
                            : "text-[#5e5a6b] hover:bg-violet-50 hover:text-violet-800"
                        }`}
                      >
                        <span aria-hidden="true" className="w-4 text-center">
                          {item.icon}
                        </span>
                        {!collapsed ? <span>{item.label}</span> : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>

      <div className="border-t border-line p-3">
        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          className="hidden min-h-9 w-full items-center gap-2.5 rounded-lg px-3 text-xs font-semibold text-muted transition-colors hover:bg-violet-50 hover:text-violet-800 lg:flex"
          aria-pressed={collapsed}
        >
          <span aria-hidden="true">{collapsed ? "»" : "«"}</span>
          {!collapsed ? "Collapse" : null}
        </button>
      </div>
    </nav>
  );

  return (
    <div className="flex min-h-dvh">
      {/* Desktop sidebar */}
      <aside
        className={`hidden shrink-0 border-r border-line bg-white transition-[width] duration-200 lg:block ${
          collapsed ? "w-[68px]" : "w-[236px]"
        }`}
      >
        <div className="sticky top-0 h-dvh">{sidebar}</div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen ? (
        <>
          <div
            className="fixed inset-0 z-40 bg-violet-950/30 lg:hidden"
            aria-hidden="true"
            onClick={() => setMobileOpen(false)}
          />
          <aside
            id={drawerId}
            className="fixed inset-y-0 left-0 z-50 w-[260px] border-r border-line bg-white lg:hidden"
          >
            {sidebar}
          </aside>
        </>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line bg-white/90 px-4 backdrop-blur sm:px-6">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
            aria-controls={drawerId}
            aria-expanded={mobileOpen}
            className="grid size-10 place-items-center rounded-lg text-xl text-ink hover:bg-violet-50 lg:hidden"
          >
            <span aria-hidden="true">☰</span>
          </button>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">
              {user.name}
              <span className="ml-2 rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-bold text-violet-800">
                {ROLE_LABELS[user.role]}
              </span>
            </p>
            <p className="truncate text-xs text-muted">{user.email}</p>
          </div>

          {!user.totpEnabled ? (
            <Link
              href={toAdminHref("/account/2fa")}
              className="hidden rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-900 sm:block"
            >
              Set up 2FA
            </Link>
          ) : null}

          <form action={logout}>
            <button
              type="submit"
              className="min-h-9 rounded-lg border border-line px-3 text-xs font-bold text-[#5e5a6b] transition-colors hover:border-violet-200 hover:bg-violet-50 hover:text-violet-800"
            >
              Sign out
            </button>
          </form>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
