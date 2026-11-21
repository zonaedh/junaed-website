/**
 * Analytics core — pure, no database and no Node built-ins.
 *
 * Everything here is a function of its arguments, so it can be unit tested and
 * imported by a `"use client"` consent banner without dragging `pg` into the
 * browser bundle (the same rule as D-025).
 *
 * The database-backed readers live in `src/lib/analytics/repository.ts`.
 */

/* ------------------------------- user agent -------------------------------- */

export type DeviceKind = "desktop" | "mobile" | "tablet" | "bot" | "unknown";

export type ParsedUserAgent = {
  device: DeviceKind;
  browser: string;
  os: string;
  isBot: boolean;
};

/**
 * Classify a user agent.
 *
 * Deliberately small and order-sensitive rather than a full UA database: the
 * only questions this site needs answered are "phone or desktop", "which
 * browser family", and "is this a crawler". Tablet is checked before mobile
 * because an iPad UA contains "Mobile".
 */
export function parseUserAgent(ua: string | null | undefined): ParsedUserAgent {
  const raw = (ua ?? "").trim();
  if (!raw) return { device: "unknown", browser: "unknown", os: "unknown", isBot: false };

  const s = raw.toLowerCase();

  // Crawlers first: a bot UA often also claims to be a browser.
  const botPatterns = [
    "bot",
    "crawler",
    "spider",
    "crawling",
    "slurp",
    "facebookexternalhit",
    "headlesschrome",
    "lighthouse",
    "pingdom",
    "uptimerobot",
    "gtmetrix",
    "python-requests",
    "curl/",
    "wget",
    "axios/",
    "go-http-client",
    "scrapy",
  ];
  const isBot = botPatterns.some((pattern) => s.includes(pattern));

  let device: DeviceKind = "desktop";
  if (isBot) device = "bot";
  else if (/ipad|tablet|playbook|silk|(android(?!.*mobile))/.test(s)) device = "tablet";
  else if (/mobile|iphone|ipod|android|blackberry|opera mini|iemobile/.test(s)) device = "mobile";

  let browser = "Other";
  if (s.includes("edg/")) browser = "Edge";
  else if (s.includes("opr/") || s.includes("opera")) browser = "Opera";
  else if (s.includes("chrome") && !s.includes("chromium")) browser = "Chrome";
  else if (s.includes("firefox")) browser = "Firefox";
  else if (s.includes("safari")) browser = "Safari";
  else if (isBot) browser = "Bot";

  let os = "Other";
  if (s.includes("windows")) os = "Windows";
  else if (/iphone|ipad|ipod/.test(s)) os = "iOS";
  else if (s.includes("android")) os = "Android";
  else if (s.includes("mac os x") || s.includes("macintosh")) os = "macOS";
  else if (s.includes("linux")) os = "Linux";

  return { device, browser, os, isBot };
}

/* --------------------------------- UTM ------------------------------------- */

export type UtmParams = {
  source: string | null;
  medium: string | null;
  campaign: string | null;
};

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign"] as const;

/**
 * Pull the three UTM values that matter out of a query string.
 *
 * Values are trimmed and capped at the column width so a hostile query string
 * cannot fail the insert. Empty strings become null, because "" and null mean
 * the same thing here and only one of them should reach the database.
 */
export function parseUtm(search: string): UtmParams {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const pick = (key: string): string | null => {
    const value = params.get(key);
    if (!value) return null;
    const trimmed = value.trim().slice(0, 120);
    return trimmed.length > 0 ? trimmed : null;
  };

  return {
    source: pick(UTM_KEYS[0]),
    medium: pick(UTM_KEYS[1]),
    campaign: pick(UTM_KEYS[2]),
  };
}

/* ------------------------------- referrer ---------------------------------- */

export type ReferrerSource = {
  /** The host, or "Direct" when there is no usable referrer. */
  label: string;
  /** True when the referrer is this site (an internal navigation). */
  isInternal: boolean;
};

/**
 * Reduce a referrer URL to a readable source label.
 *
 * Known search and social hosts get a friendly name because "which channel"
 * is the question the owner is asking; everything else keeps its hostname.
 */
export function classifyReferrer(
  referrer: string | null | undefined,
  siteHost: string,
): ReferrerSource {
  const raw = (referrer ?? "").trim();
  if (!raw) return { label: "Direct", isInternal: false };

  let host: string;
  try {
    host = new URL(raw).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return { label: "Direct", isInternal: false };
  }

  const cleanSite = siteHost.toLowerCase().replace(/^www\./, "");
  if (host === cleanSite || host.endsWith(`.${cleanSite}`)) {
    return { label: "Internal", isInternal: true };
  }

  const known: Record<string, string> = {
    "google.com": "Google",
    "bing.com": "Bing",
    "duckduckgo.com": "DuckDuckGo",
    "yahoo.com": "Yahoo",
    "facebook.com": "Facebook",
    "instagram.com": "Instagram",
    "linkedin.com": "LinkedIn",
    "t.co": "X / Twitter",
    "x.com": "X / Twitter",
    "twitter.com": "X / Twitter",
    "reddit.com": "Reddit",
    "youtube.com": "YouTube",
    "whatsapp.com": "WhatsApp",
    "pinterest.com": "Pinterest",
  };

  for (const [domain, label] of Object.entries(known)) {
    if (host === domain || host.endsWith(`.${domain}`)) {
      return { label, isInternal: false };
    }
  }

  return { label: host, isInternal: false };
}

/* -------------------------------- consent ---------------------------------- */

export type ConsentChoice = "accepted" | "rejected" | "unset";

export const CONSENT_COOKIE = "jh_consent";
export const CONSENT_VERSION = 1;

/**
 * Parse the stored consent cookie.
 *
 * The version is part of the value so a future change to what consent covers
 * can invalidate old answers instead of silently inheriting them. Anything
 * unrecognised is "unset", which means "ask again" — never "assume yes".
 */
export function parseConsent(value: string | null | undefined): ConsentChoice {
  if (!value) return "unset";
  const [choice, version] = value.split(".");
  if (version !== String(CONSENT_VERSION)) return "unset";
  if (choice === "accepted" || choice === "rejected") return choice;
  return "unset";
}

export function serializeConsent(choice: Exclude<ConsentChoice, "unset">): string {
  return `${choice}.${CONSENT_VERSION}`;
}

/**
 * Consent Mode v2 default signals.
 *
 * Every advertising and analytics signal starts denied. Accepting flips them;
 * rejecting leaves them denied. This is the shape Google expects, and getting
 * it wrong is the difference between compliant and not.
 */
export function consentModeDefaults(granted: boolean): Record<string, string> {
  const value = granted ? "granted" : "denied";
  return {
    ad_storage: value,
    ad_user_data: value,
    ad_personalization: value,
    analytics_storage: value,
  };
}

/* ------------------------------ date ranges -------------------------------- */

export type RangeKey = "today" | "7d" | "30d" | "90d";

export type DateRange = {
  key: RangeKey;
  /** Inclusive start, at local midnight. */
  from: Date;
  /** Exclusive end, i.e. "now". */
  to: Date;
  label: string;
};

/**
 * Resolve a range key into concrete dates.
 *
 * `to` is exclusive so a query can use `created_at >= from AND created_at < to`
 * without double-counting the boundary instant. "Today" means since local
 * midnight, which is what an owner means by today.
 */
export function resolveRange(key: RangeKey, now = new Date()): DateRange {
  const to = new Date(now);
  const from = new Date(now);

  if (key === "today") {
    from.setHours(0, 0, 0, 0);
    return { key, from, to, label: "Today" };
  }

  const days = key === "7d" ? 7 : key === "30d" ? 30 : 90;
  from.setHours(0, 0, 0, 0);
  from.setDate(from.getDate() - (days - 1));

  return {
    key,
    from,
    to,
    label: key === "7d" ? "Last 7 days" : key === "30d" ? "Last 30 days" : "Last 90 days",
  };
}

export function isRangeKey(value: string): value is RangeKey {
  return value === "today" || value === "7d" || value === "30d" || value === "90d";
}

/** Percentage change between two counts, rounded. Null when there is no base. */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 100);
}

/** Conversion rate as a percentage with one decimal. */
export function conversionRate(conversions: number, visitors: number): number {
  if (visitors === 0) return 0;
  return Math.round((conversions / visitors) * 1000) / 10;
}

/* ------------------------------ path safety -------------------------------- */

/**
 * Normalise a tracked path.
 *
 * Query strings are dropped (the UTM values are stored separately, and a
 * per-query path would explode the "top pages" list). Anything that is not a
 * site-relative path is rejected outright, so a tracker call cannot be used to
 * store arbitrary text in the path column.
 */
export function normaliseTrackedPath(value: string | null | undefined): string | null {
  const raw = (value ?? "").trim();
  if (!raw) return null;
  if (!raw.startsWith("/")) return null;
  if (raw.startsWith("//")) return null;

  const withoutQuery = raw.split("?")[0].split("#")[0];
  if (!withoutQuery.startsWith("/")) return null;

  // Collapse a trailing slash so /blog and /blog/ are one page.
  const collapsed =
    withoutQuery.length > 1 && withoutQuery.endsWith("/")
      ? withoutQuery.replace(/\/+$/, "")
      : withoutQuery;

  return collapsed.slice(0, 500);
}

/** Paths that must never be tracked: the admin surface and machine endpoints. */
export function isTrackablePath(path: string): boolean {
  if (path.startsWith("/admin")) return false;
  if (path.startsWith("/api")) return false;
  if (path.startsWith("/_next")) return false;
  return true;
}