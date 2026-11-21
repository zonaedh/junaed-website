"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { CONSENT_COOKIE, parseConsent } from "@/lib/analytics/core";

/**
 * First-party page-view beacon and the standard dataLayer events
 * (MVP.md §7.1 and §7.3).
 *
 * It sends nothing until consent is "accepted". That check is the whole point:
 * a tracker that fires before the visitor answers makes the banner a lie.
 *
 * The beacon uses `keepalive` so a view is still recorded when the visitor
 * navigates away immediately, and `sendBeacon` where available because it
 * survives the page being torn down.
 */

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

function hasConsent(): boolean {
  if (typeof document === "undefined") return false;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${CONSENT_COOKIE}=`));
  if (!match) return false;
  return parseConsent(decodeURIComponent(match.split("=")[1] ?? "")) === "accepted";
}

function sendView(path: string) {
  const payload = JSON.stringify({
    path,
    referrer: document.referrer || "",
  });

  if (navigator.sendBeacon) {
    navigator.sendBeacon("/api/track", new Blob([payload], { type: "application/json" }));
    return;
  }

  void fetch("/api/track", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: payload,
    keepalive: true,
  }).catch(() => {
    // Tracking must never surface an error to the visitor.
  });
}

export function AnalyticsTracker() {
  const pathname = usePathname();

  // One page view per navigation, and only with consent.
  useEffect(() => {
    if (!pathname) return;
    if (!hasConsent()) return;
    sendView(pathname);
  }, [pathname]);

  // Standard events. These are delegated on document so they keep working for
  // links rendered after this mounts, which is most of them.
  useEffect(() => {
    if (!hasConsent()) return;

    function push(event: string, params: Record<string, unknown> = {}) {
      window.dataLayer = window.dataLayer ?? [];
      window.dataLayer.push({ event, ...params });
    }

    function onClick(event: MouseEvent) {
      const target = (event.target as HTMLElement | null)?.closest("a");
      if (!target) return;
      const href = target.getAttribute("href") ?? "";

      if (href.startsWith("tel:")) {
        push("click_phone", { phone: href.replace("tel:", "") });
      } else if (href.startsWith("mailto:")) {
        push("click_email", { email: href.replace("mailto:", "").split("?")[0] });
      } else if (href.includes("wa.me") || href.includes("whatsapp.com")) {
        push("click_whatsapp");
      } else if (href.startsWith("/portfolio/")) {
        push("view_portfolio_item", { path: href });
      }
    }

    // scroll_75 fires once per page, at 75% depth. A bounce proxy that fires on
    // every scroll event would be useless.
    let fired = false;
    function onScroll() {
      if (fired) return;
      const doc = document.documentElement;
      const scrolled = window.scrollY + window.innerHeight;
      const height = doc.scrollHeight;
      if (height <= 0) return;
      if (scrolled / height >= 0.75) {
        fired = true;
        push("scroll_75", { path: window.location.pathname });
      }
    }

    document.addEventListener("click", onClick);
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      document.removeEventListener("click", onClick);
      window.removeEventListener("scroll", onScroll);
    };
  }, [pathname]);

  return null;
}

/** Push a conversion event. Called from the contact form after a success. */
export function pushLeadEvent(source = "contact_form") {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push({ event: "generate_lead", source });
}