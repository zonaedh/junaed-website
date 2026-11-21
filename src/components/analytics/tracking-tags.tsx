"use client";

import Script from "next/script";
import { useSyncExternalStore } from "react";
import { CONSENT_COOKIE, consentModeDefaults, parseConsent } from "@/lib/analytics/core";

/**
 * Third-party tag loader (MVP.md §7.1).
 *
 * Server-rendered settings arrive as props; this component decides *when* to
 * load, which is the part that has to be client-side because it depends on the
 * visitor's consent cookie.
 *
 * Two behaviours worth knowing:
 *
 *  - **Consent Mode v2 defaults are set before any tag loads.** Google expects
 *    the default to be pushed first; pushing it afterwards means the first
 *    hits are recorded with the wrong state.
 *  - **When consent is required and not yet given, nothing loads at all** —
 *    not even the GTM container. Loading the container and hoping it respects
 *    the signal is not the same as not loading it.
 */

export type TrackingConfig = {
  gtmId: string;
  ga4Id: string;
  metaPixelId: string;
  clarityId: string;
  consentRequired: boolean;
};

function readConsent(): "accepted" | "rejected" | "unset" {
  if (typeof document === "undefined") return "unset";
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${CONSENT_COOKIE}=`));
  if (!match) return "unset";
  return parseConsent(decodeURIComponent(match.split("=")[1] ?? ""));
}

function subscribeToConsent(onChange: () => void) {
  window.addEventListener("jh:consent", onChange);
  return () => window.removeEventListener("jh:consent", onChange);
}

const subscribeToNothing = () => () => {};
const clientMounted = () => true;
const serverMounted = () => false;
const serverChoice = () => "unset" as const;

export function TrackingTags({ config }: { config: TrackingConfig }) {
  // Consent is an external store (a cookie plus the `jh:consent` event), so it
  // is read through useSyncExternalStore instead of being mirrored into state.
  // The server snapshot is always "unset", so nothing loads during SSR.
  const choice = useSyncExternalStore(
    subscribeToConsent,
    readConsent,
    serverChoice,
  );
  const mounted = useSyncExternalStore(
    subscribeToNothing,
    clientMounted,
    serverMounted,
  );

  const granted = !config.consentRequired || choice === "accepted";

  const hasAny =
    config.gtmId || config.ga4Id || config.metaPixelId || config.clarityId;

  if (!hasAny || !mounted || !granted) return null;

  return (
    <>
      {/* Consent Mode v2 defaults must land before the first tag. */}
      <Script id="consent-default" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}
gtag('consent','default',${JSON.stringify(consentModeDefaults(true))});`}
      </Script>

      {config.gtmId ? (
        <Script id="gtm" strategy="afterInteractive">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});
var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';
j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;
f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${config.gtmId}');`}
        </Script>
      ) : null}

      {config.ga4Id ? (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${config.ga4Id}`}
            strategy="afterInteractive"
          />
          <Script id="ga4" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}
gtag('js',new Date());gtag('config','${config.ga4Id}');`}
          </Script>
        </>
      ) : null}

      {config.metaPixelId ? (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${config.metaPixelId}');fbq('track','PageView');`}
        </Script>
      ) : null}

      {config.clarityId ? (
        <Script id="clarity" strategy="afterInteractive">
          {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,
document,"clarity","script","${config.clarityId}");`}
        </Script>
      ) : null}
    </>
  );
}