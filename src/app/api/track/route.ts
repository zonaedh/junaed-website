import { NextResponse, type NextRequest } from "next/server";
import { recordPageView } from "@/lib/analytics/repository";
import {
  classifyReferrer,
  isTrackablePath,
  normaliseTrackedPath,
  parseUserAgent,
  parseUtm,
} from "@/lib/analytics/core";
import { hashIp } from "@/lib/security/hash";
import { checkRateLimit } from "@/lib/contact/rate-limit";
import { TRACK_RULE } from "@/lib/security/rate-limit-rules";
import { clientAddressFromHeaders } from "@/lib/security/ip";
import { getSeoDefaults } from "@/lib/seo/repository";

/**
 * First-party page-view tracker (MVP.md §7.3).
 *
 * Design rules, all of them load-bearing:
 *
 *  - **No raw IP is ever stored.** `hashIp` salts with the secret plus the
 *    calendar day, so the same visitor is recognisable within a day and
 *    uncorrelatable across days. That is what makes "unique visitors" honest
 *    without keeping an identifier that could be used to follow someone.
 *  - **Bots are dropped, not counted.** A crawler inflating the numbers is
 *    worse than no numbers.
 *  - **Only real site paths are accepted.** The path is normalised and checked
 *    against the admin/API surface, so this endpoint cannot be used to write
 *    arbitrary strings into the analytics table.
 *  - **Failure is silent.** A tracker that throws into the visitor's page is a
 *    tracker that breaks the site. Every path returns 204.
 *
 * The client only calls this after consent (see the consent banner), and the
 * route re-checks nothing about consent: the cookie is the record, and a
 * visitor who declined never sends the request in the first place.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TrackPayload = {
  path?: string;
  referrer?: string;
  /** Client-measured engagement, used for the bounce proxy. */
  engaged?: boolean;
};

const NO_CONTENT = new NextResponse(null, { status: 204 });

export async function POST(request: NextRequest) {
  try {
    // Respect an explicit opt-out signal from the browser.
    if (request.headers.get("dnt") === "1") return NO_CONTENT;

    const body = (await request.json().catch(() => ({}))) as TrackPayload;

    const path = normaliseTrackedPath(body.path);
    if (!path || !isTrackablePath(path)) return NO_CONTENT;

    const userAgent = request.headers.get("user-agent");
    const parsed = parseUserAgent(userAgent);
    if (parsed.isBot) return NO_CONTENT;

    const seo = await getSeoDefaults();
    const siteHost = seo.siteUrl.replace(/^https?:\/\//, "").replace(/\/+$/, "");

    // The referrer is stored as a readable source label, not the full URL: the
    // full URL of an external page is other people's data and adds nothing.
    const source = classifyReferrer(body.referrer, siteHost);

    const utm = parseUtm(request.nextUrl.search || "");

    // Vercel sets these; absent locally, which is fine.
    const country =
      request.headers.get("x-vercel-ip-country") ??
      request.headers.get("cf-ipcountry") ??
      null;

    const ip = clientAddressFromHeaders(request.headers);
    const ipHash = hashIp(ip);

    // Per-endpoint limit (MVP.md §8.1). The proxy already applies a coarse
    // per-address limit; this one is exact and shared across instances when
    // Upstash is configured.
    if (ipHash) {
      const limit = await checkRateLimit(ipHash, TRACK_RULE);
      if (!limit.allowed) return NO_CONTENT;
    }

    await recordPageView({
      path,
      referrer: source.isInternal ? null : source.label,
      country: country ? country.slice(0, 2).toUpperCase() : null,
      device: parsed.device,
      browser: parsed.browser,
      utmSource: utm.source,
      utmMedium: utm.medium,
      utmCampaign: utm.campaign,
      visitorHash: ipHash,
      sessionHash: null,
    });
  } catch (error) {
    // Never surface a tracking failure to the visitor.
    console.error("[track] failed", error instanceof Error ? error.message : "unknown");
  }

  return NO_CONTENT;
}

/** A GET here is a mistake, not a page view. */
export function GET() {
  return new NextResponse(null, { status: 405 });
}