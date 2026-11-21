import type { ReactNode } from "react";
import { Header } from "@/components/site/header";
import { Footer } from "@/components/site/footer";
import { getSettings } from "@/lib/settings";
import { ConsentBanner } from "@/components/analytics/consent-banner";
import { AnalyticsTracker } from "@/components/analytics/analytics-tracker";
import { TrackingTags } from "@/components/analytics/tracking-tags";
import { CustomScripts } from "@/components/analytics/custom-scripts";
import { headers } from "next/headers";

/**
 * Public site layout.
 *
 * Settings are read here, once, and passed down. The header and footer are the
 * two components that need them on every page, and reading in the layout means
 * one cached query per request instead of one per component.
 *
 * The layout is async now — that is the whole point of Phase 3: the chrome is
 * database-driven, not hardcoded.
 */
export default async function SiteLayout({
  children,
}: {
  children: ReactNode;
}) {
  const settings = await getSettings();

  // The proxy sets this on every public request so a server component can scope
  // custom snippets without turning the layout into a client component.
  const pathname = (await headers()).get("x-pathname") ?? "/";

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Without JS the reveal animation never runs, so force content visible. */}
      <noscript>
        <style>{`.js-reveal{opacity:1!important;transform:none!important}`}</style>
      </noscript>

      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-100 focus:rounded-lg focus:bg-violet-950 focus:px-4 focus:py-2.5 focus:text-sm focus:font-bold focus:text-white"
      >
        Skip to content
      </a>
      <Header siteName={settings.name} shortName={settings.shortName} />
      <CustomScripts pathname={pathname} location="body_start" />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer
        siteName={settings.name}
        shortName={settings.shortName}
        footerText={settings.footerText}
      />

      {/*
        Analytics lives here and only here. The admin tree has its own layout,
        so no tracking tag can ever load on the admin surface (MVP.md §7.1).
      */}
      <TrackingTags
        config={{
          gtmId: settings.gtmId,
          ga4Id: settings.ga4Id,
          metaPixelId: settings.metaPixelId,
          clarityId: settings.clarityId,
          consentRequired: settings.consentRequired,
        }}
      />
      <AnalyticsTracker />
      <ConsentBanner />
      <CustomScripts pathname={pathname} location="body_end" />
    </div>
  );
}
