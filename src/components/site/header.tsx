"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { mainNav, site } from "@/lib/site";
import { ArrowUpRight } from "@/components/ui/button";

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape, return focus to the toggle.
  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  // Close when clicking outside the panel.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (
        !panelRef.current?.contains(target) &&
        !toggleRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  // Lock body scroll while the mobile panel is open.
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  // Closing on click is more reliable than reacting to a pathname change,
  // and avoids a setState-in-effect render cascade.
  const close = () => setOpen(false);

  return (
    <header className="relative z-50">
      <div className="wrap flex h-[72px] items-center justify-between md:h-[84px]">
        <Link
          href="/"
          onClick={close}
          className="flex items-center gap-[11px] font-display text-[17px] font-extrabold tracking-[-0.04em]"
          aria-label={`${site.name} — home`}
        >
          <span
            aria-hidden="true"
            className="grid size-[38px] place-items-center rounded-[13px] bg-linear-145 from-violet-500 to-violet-950 text-[17px] font-extrabold text-white shadow-[0_6px_18px_rgb(127_93_245/0.24)]"
          >
            {site.shortName.charAt(0)}
          </span>
          <span>{site.name}</span>
        </Link>

        <nav aria-label="Main navigation" className="hidden lg:block">
          <ul className="flex items-center gap-[30px] text-[15px] font-semibold text-[#5e5a6b]">
            {mainNav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className={`transition-colors hover:text-violet-600 ${
                    isActive(item.href) ? "text-violet-700" : ""
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <Link
          href="/contact"
          className="hidden min-h-11 items-center justify-center gap-2.5 rounded-[13px] bg-violet-950 px-5 py-3.5 text-[15px] font-bold text-white transition duration-200 hover:-translate-y-0.5 hover:bg-violet-700 lg:inline-flex"
        >
          Let&rsquo;s Talk <ArrowUpRight />
        </Link>

        <button
          ref={toggleRef}
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={open ? "Close navigation" : "Open navigation"}
          className="grid size-11 place-items-center rounded-xl text-2xl text-ink transition-colors hover:bg-violet-50 lg:hidden"
        >
          <span aria-hidden="true">{open ? "✕" : "☰"}</span>
        </button>
      </div>

      {open ? (
        <>
          <div
            className="fixed inset-0 top-[72px] z-40 bg-violet-950/25 lg:hidden"
            aria-hidden="true"
            onClick={close}
          />
          <div
            ref={panelRef}
            id={panelId}
            className="absolute inset-x-[22px] top-[70px] z-50 rounded-[18px] border border-line bg-white p-5 shadow-soft lg:hidden"
          >
            <nav aria-label="Mobile navigation">
              <ul className="flex flex-col gap-1">
                {mainNav.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={close}
                      aria-current={isActive(item.href) ? "page" : undefined}
                      className={`flex min-h-11 items-center rounded-lg px-3 text-base font-semibold transition-colors hover:bg-violet-50 ${
                        isActive(item.href) ? "text-violet-700" : "text-[#5e5a6b]"
                      }`}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <Link
              href="/contact"
              onClick={close}
              className="mt-3 flex min-h-12 w-full items-center justify-center gap-2.5 rounded-[13px] bg-violet-950 px-5 py-3.5 text-[15px] font-bold text-white"
            >
              Let&rsquo;s Talk <ArrowUpRight />
            </Link>
          </div>
        </>
      ) : null}
    </header>
  );
}
