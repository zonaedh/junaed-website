import { describe, expect, it } from "vitest";
import {
  classifyReferrer,
  consentModeDefaults,
  conversionRate,
  isRangeKey,
  isTrackablePath,
  normaliseTrackedPath,
  parseConsent,
  parseUserAgent,
  parseUtm,
  percentChange,
  resolveRange,
  serializeConsent,
} from "./core";

describe("parseUserAgent", () => {
  it("detects a desktop Chrome on Windows", () => {
    const result = parseUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
    );
    expect(result.device).toBe("desktop");
    expect(result.browser).toBe("Chrome");
    expect(result.os).toBe("Windows");
    expect(result.isBot).toBe(false);
  });

  it("detects an iPhone as mobile Safari on iOS", () => {
    const result = parseUserAgent(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    );
    expect(result.device).toBe("mobile");
    expect(result.browser).toBe("Safari");
    expect(result.os).toBe("iOS");
  });

  it("treats an iPad as a tablet, not a mobile", () => {
    // An iPad UA contains "Mobile", so the tablet check must come first.
    const result = parseUserAgent(
      "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    );
    expect(result.device).toBe("tablet");
  });

  it("flags Googlebot as a bot even though it claims Chrome", () => {
    const result = parseUserAgent(
      "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    );
    expect(result.isBot).toBe(true);
    expect(result.device).toBe("bot");
  });

  it("flags curl", () => {
    expect(parseUserAgent("curl/8.4.0").isBot).toBe(true);
  });

  it("detects Edge before Chrome", () => {
    const result = parseUserAgent(
      "Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36 Edg/120.0",
    );
    expect(result.browser).toBe("Edge");
  });

  it("handles an empty user agent without throwing", () => {
    expect(parseUserAgent("").device).toBe("unknown");
    expect(parseUserAgent(null).browser).toBe("unknown");
  });
});

describe("parseUtm", () => {
  it("extracts the three tracked parameters", () => {
    const utm = parseUtm("?utm_source=newsletter&utm_medium=email&utm_campaign=launch");
    expect(utm).toEqual({
      source: "newsletter",
      medium: "email",
      campaign: "launch",
    });
  });

  it("returns nulls when absent", () => {
    expect(parseUtm("")).toEqual({ source: null, medium: null, campaign: null });
  });

  it("treats an empty value as null", () => {
    expect(parseUtm("?utm_source=").source).toBeNull();
  });

  it("caps a hostile value at the column width", () => {
    const utm = parseUtm(`?utm_source=${"x".repeat(500)}`);
    expect(utm.source?.length).toBe(120);
  });

  it("accepts a search string without the leading question mark", () => {
    expect(parseUtm("utm_source=direct").source).toBe("direct");
  });
});

describe("classifyReferrer", () => {
  it("labels an empty referrer as Direct", () => {
    expect(classifyReferrer("", "example.com").label).toBe("Direct");
    expect(classifyReferrer(null, "example.com").label).toBe("Direct");
  });

  it("labels a same-site referrer as Internal", () => {
    const result = classifyReferrer("https://example.com/blog", "example.com");
    expect(result.label).toBe("Internal");
    expect(result.isInternal).toBe(true);
  });

  it("treats a subdomain as internal", () => {
    expect(classifyReferrer("https://www.example.com/x", "example.com").isInternal).toBe(true);
  });

  it("maps known search hosts to friendly names", () => {
    expect(classifyReferrer("https://www.google.com/search?q=x", "example.com").label).toBe(
      "Google",
    );
    expect(classifyReferrer("https://duckduckgo.com/", "example.com").label).toBe(
      "DuckDuckGo",
    );
  });

  it("maps social hosts", () => {
    expect(classifyReferrer("https://t.co/abc", "example.com").label).toBe("X / Twitter");
    expect(classifyReferrer("https://www.linkedin.com/feed", "example.com").label).toBe(
      "LinkedIn",
    );
  });

  it("keeps an unknown hostname as the label", () => {
    expect(classifyReferrer("https://someblog.dev/post", "example.com").label).toBe(
      "someblog.dev",
    );
  });

  it("does not throw on a malformed referrer", () => {
    expect(classifyReferrer("not a url", "example.com").label).toBe("Direct");
  });
});

describe("consent", () => {
  it("round-trips an accepted choice", () => {
    expect(parseConsent(serializeConsent("accepted"))).toBe("accepted");
  });

  it("round-trips a rejected choice", () => {
    expect(parseConsent(serializeConsent("rejected"))).toBe("rejected");
  });

  it("treats a missing cookie as unset", () => {
    expect(parseConsent(null)).toBe("unset");
    expect(parseConsent("")).toBe("unset");
  });

  it("treats an old version as unset so the visitor is asked again", () => {
    expect(parseConsent("accepted.0")).toBe("unset");
  });

  it("treats nonsense as unset rather than assuming yes", () => {
    expect(parseConsent("yes")).toBe("unset");
    expect(parseConsent("accepted")).toBe("unset");
  });
});

describe("consentModeDefaults", () => {
  it("denies everything by default", () => {
    expect(consentModeDefaults(false)).toEqual({
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
      analytics_storage: "denied",
    });
  });

  it("grants everything on acceptance", () => {
    const granted = consentModeDefaults(true);
    expect(Object.values(granted).every((v) => v === "granted")).toBe(true);
  });
});

describe("resolveRange", () => {
  const now = new Date("2026-11-21T15:30:00");

  it("starts today at midnight", () => {
    const range = resolveRange("today", now);
    expect(range.from.getHours()).toBe(0);
    expect(range.from.getDate()).toBe(21);
  });

  it("spans seven days inclusive of today", () => {
    const range = resolveRange("7d", now);
    expect(range.from.getDate()).toBe(15);
    expect(range.to.getTime()).toBe(now.getTime());
  });

  it("spans thirty days inclusive of today", () => {
    const range = resolveRange("30d", now);
    expect(range.from.getDate()).toBe(23);
    expect(range.from.getMonth()).toBe(9); // October
  });

  it("labels each range", () => {
    expect(resolveRange("today", now).label).toBe("Today");
    expect(resolveRange("7d", now).label).toBe("Last 7 days");
    expect(resolveRange("90d", now).label).toBe("Last 90 days");
  });

  it("validates range keys", () => {
    expect(isRangeKey("7d")).toBe(true);
    expect(isRangeKey("1y")).toBe(false);
  });
});

describe("percentChange", () => {
  it("computes a rise", () => {
    expect(percentChange(120, 100)).toBe(20);
  });

  it("computes a fall", () => {
    expect(percentChange(80, 100)).toBe(-20);
  });

  it("returns null when there is no base to compare against", () => {
    // Reporting "+100%" from zero is a lie; null renders as "no comparison".
    expect(percentChange(10, 0)).toBeNull();
  });

  it("returns zero when both are zero", () => {
    expect(percentChange(0, 0)).toBe(0);
  });
});

describe("conversionRate", () => {
  it("computes a percentage with one decimal", () => {
    expect(conversionRate(3, 120)).toBe(2.5);
  });

  it("returns zero for no visitors rather than dividing by zero", () => {
    expect(conversionRate(0, 0)).toBe(0);
  });
});

describe("normaliseTrackedPath", () => {
  it("keeps a simple path", () => {
    expect(normaliseTrackedPath("/blog")).toBe("/blog");
  });

  it("drops the query string", () => {
    expect(normaliseTrackedPath("/blog?utm_source=x&page=2")).toBe("/blog");
  });

  it("drops the hash", () => {
    expect(normaliseTrackedPath("/blog#top")).toBe("/blog");
  });

  it("collapses a trailing slash", () => {
    expect(normaliseTrackedPath("/blog/")).toBe("/blog");
    expect(normaliseTrackedPath("/blog///")).toBe("/blog");
  });

  it("keeps the root path intact", () => {
    expect(normaliseTrackedPath("/")).toBe("/");
  });

  it("rejects a relative path", () => {
    expect(normaliseTrackedPath("blog")).toBeNull();
  });

  it("rejects a protocol-relative path", () => {
    expect(normaliseTrackedPath("//evil.com/x")).toBeNull();
  });

  it("rejects an absolute URL", () => {
    expect(normaliseTrackedPath("https://evil.com/x")).toBeNull();
  });

  it("rejects empty input", () => {
    expect(normaliseTrackedPath("")).toBeNull();
    expect(normaliseTrackedPath(null)).toBeNull();
  });
});

describe("isTrackablePath", () => {
  it("tracks public pages", () => {
    expect(isTrackablePath("/blog")).toBe(true);
    expect(isTrackablePath("/")).toBe(true);
  });

  it("never tracks the admin or API surface", () => {
    expect(isTrackablePath("/admin/posts")).toBe(false);
    expect(isTrackablePath("/api/track")).toBe(false);
    expect(isTrackablePath("/_next/static/x")).toBe(false);
  });
});