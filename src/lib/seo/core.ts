/**
 * SEO core — pure, no database import.
 *
 * Everything here is a function of its arguments so it can be unit tested and
 * imported by `"use client"` components (the SERP preview and the score panel)
 * without dragging `pg` or `node:fs` into the browser bundle (D-025, B1).
 *
 * The database-backed readers live in `src/lib/seo/repository.ts`.
 */

/* ------------------------------- constants -------------------------------- */

/** Google truncates the title around here. Not a hard limit, a warning line. */
export const TITLE_SOFT_MAX = 60;
/** Meta descriptions are truncated around here. */
export const DESCRIPTION_SOFT_MAX = 160;
/** Below this a description is too thin to be useful in a result. */
export const DESCRIPTION_SOFT_MIN = 70;

/** Schema.org types the admin can pick per item. */
export const SCHEMA_TYPES = [
  "Article",
  "BlogPosting",
  "CreativeWork",
  "Service",
  "WebPage",
] as const;

export type SchemaType = (typeof SCHEMA_TYPES)[number];

export function isSchemaType(value: string): value is SchemaType {
  return (SCHEMA_TYPES as readonly string[]).includes(value);
}

/* ------------------------------ title/desc -------------------------------- */

/**
 * Build the full `<title>` for an inner page.
 *
 * The template lives in the database (Settings → SEO) so the owner can change
 * it without a deploy. `%s` is the page title; a template without `%s` gets the
 * page title appended rather than silently dropped, because a title that
 * vanishes is worse than an ugly one.
 */
export function applyTitleTemplate(pageTitle: string, template: string): string {
  const clean = pageTitle.trim();
  const tpl = template.trim();
  if (!tpl) return clean;
  if (tpl.includes("%s")) return tpl.replace(/%s/g, clean);
  return `${clean} | ${tpl}`;
}

/**
 * Trim a string to a length on a word boundary.
 *
 * Used for auto-derived descriptions (an excerpt, a first paragraph) so the
 * fallback does not cut mid-word. Never used on text the owner typed — that is
 * their wording and truncating it silently would be a lie.
 */
export function truncateAtWord(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/** A title is "too long" when it will be truncated in a result. */
export function titleLengthState(value: string): "empty" | "short" | "good" | "long" {
  const n = value.trim().length;
  if (n === 0) return "empty";
  if (n < 25) return "short";
  if (n <= TITLE_SOFT_MAX) return "good";
  return "long";
}

/** A description is "too long" past the soft max and "thin" below the soft min. */
export function descriptionLengthState(
  value: string,
): "empty" | "thin" | "good" | "long" {
  const n = value.trim().length;
  if (n === 0) return "empty";
  if (n < DESCRIPTION_SOFT_MIN) return "thin";
  if (n <= DESCRIPTION_SOFT_MAX) return "good";
  return "long";
}

/* ------------------------------- canonical -------------------------------- */

/**
 * Normalise a path into a canonical URL.
 *
 * Rules that actually matter for duplicate content:
 *  - one trailing slash policy (no trailing slash except the root)
 *  - lowercase host, path preserved (paths are case-sensitive)
 *  - drop tracking params that create duplicate URLs
 *  - an absolute URL the owner typed is respected, only normalised
 */
const TRACKING_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "fbclid",
  "gclid",
  "msclkid",
  "ref",
];

export function canonicalPath(pathOrUrl: string): string {
  const raw = pathOrUrl.trim();
  if (!raw) return "/";

  // Split off query and hash, keep only the path.
  let path = raw;
  let query = "";
  const hashIndex = path.indexOf("#");
  if (hashIndex >= 0) path = path.slice(0, hashIndex);
  const queryIndex = path.indexOf("?");
  if (queryIndex >= 0) {
    query = path.slice(queryIndex + 1);
    path = path.slice(0, queryIndex);
  }

  // If an absolute URL was given, keep only its path for normalisation.
  const absoluteMatch = path.match(/^https?:\/\/[^/]+(\/.*)?$/i);
  if (absoluteMatch) path = absoluteMatch[1] ?? "/";

  if (!path.startsWith("/")) path = `/${path}`;

  // Strip the trailing slash, except for the root itself.
  if (path.length > 1 && path.endsWith("/")) path = path.replace(/\/+$/, "");
  if (path === "") path = "/";

  // Rebuild the query without tracking params, preserving the rest.
  const kept = query
    .split("&")
    .filter(Boolean)
    .filter((pair) => {
      const key = pair.split("=")[0]?.toLowerCase() ?? "";
      return !TRACKING_PARAMS.includes(key);
    });

  return kept.length > 0 ? `${path}?${kept.join("&")}` : path;
}

/** Join a base URL and a path without producing a double slash. */
export function absoluteUrl(base: string, path: string): string {
  const cleanBase = base.replace(/\/+$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${cleanBase}${cleanPath}`;
}

/* -------------------------------- robots ---------------------------------- */

export type RobotsDirective = {
  index: boolean;
  follow: boolean;
};

/** Translate the admin's noindex checkbox into a Next metadata robots object. */
export function robotsFromNoindex(noindex: boolean): RobotsDirective {
  return { index: !noindex, follow: !noindex };
}

/** The header value the admin host sends. Kept here so proxy and tests agree. */
export const ADMIN_ROBOTS_HEADER = "noindex, nofollow, noarchive, nosnippet";

/* ------------------------------ breadcrumbs ------------------------------- */

export type Crumb = { name: string; path: string };

/**
 * Build a BreadcrumbList node.
 *
 * Every inner page gets one: it is the cheapest rich result available and it
 * replaces the raw URL in a result with a readable path.
 */
export function breadcrumbList(crumbs: Crumb[], baseUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(baseUrl, crumb.path),
    })),
  };
}

/* -------------------------------- JSON-LD --------------------------------- */

export type PersonInput = {
  name: string;
  url: string;
  jobTitle?: string;
  description?: string;
  image?: string;
  sameAs?: string[];
  email?: string;
};

export function personSchema(input: PersonInput) {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: input.name,
    url: input.url,
    ...(input.jobTitle ? { jobTitle: input.jobTitle } : {}),
    ...(input.description ? { description: input.description } : {}),
    ...(input.image ? { image: input.image } : {}),
    ...(input.email ? { email: input.email } : {}),
    ...(input.sameAs && input.sameAs.length > 0 ? { sameAs: input.sameAs } : {}),
  };
}

export function websiteSchema(input: {
  name: string;
  url: string;
  description?: string;
  publisherName?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: input.name,
    url: input.url,
    ...(input.description ? { description: input.description } : {}),
    ...(input.publisherName
      ? { publisher: { "@type": "Organization", name: input.publisherName } }
      : {}),
  };
}

export function professionalServiceSchema(input: {
  name: string;
  url: string;
  description?: string;
  email?: string;
  telephone?: string;
  image?: string;
  areaServed?: string;
  services?: string[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: input.name,
    url: input.url,
    ...(input.description ? { description: input.description } : {}),
    ...(input.email ? { email: input.email } : {}),
    ...(input.telephone ? { telephone: input.telephone } : {}),
    ...(input.image ? { image: input.image } : {}),
    ...(input.areaServed ? { areaServed: input.areaServed } : {}),
    ...(input.services && input.services.length > 0
      ? {
          hasOfferCatalog: {
            "@type": "OfferCatalog",
            name: "Services",
            itemListElement: input.services.map((service) => ({
              "@type": "Offer",
              itemOffered: { "@type": "Service", name: service },
            })),
          },
        }
      : {}),
  };
}

export function serviceSchema(input: {
  name: string;
  description: string;
  url: string;
  providerName: string;
  providerUrl: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: input.name,
    description: input.description,
    url: input.url,
    provider: {
      "@type": "Organization",
      name: input.providerName,
      url: input.providerUrl,
    },
  };
}

export function articleSchema(input: {
  type: "Article" | "BlogPosting";
  headline: string;
  description: string;
  url: string;
  image?: string;
  datePublished?: string;
  dateModified?: string;
  authorName: string;
  authorUrl?: string;
  publisherName: string;
  publisherUrl: string;
  wordCount?: number;
}) {
  return {
    "@context": "https://schema.org",
    "@type": input.type,
    headline: input.headline,
    description: input.description,
    url: input.url,
    ...(input.image ? { image: [input.image] } : {}),
    ...(input.datePublished ? { datePublished: input.datePublished } : {}),
    ...(input.dateModified ? { dateModified: input.dateModified } : {}),
    ...(input.wordCount ? { wordCount: input.wordCount } : {}),
    author: {
      "@type": "Person",
      name: input.authorName,
      ...(input.authorUrl ? { url: input.authorUrl } : {}),
    },
    publisher: {
      "@type": "Organization",
      name: input.publisherName,
      url: input.publisherUrl,
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": input.url },
  };
}

export function contactPageSchema(input: {
  name: string;
  url: string;
  description?: string;
  email?: string;
  telephone?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: input.name,
    url: input.url,
    ...(input.description ? { description: input.description } : {}),
    ...(input.email || input.telephone
      ? {
          mainEntity: {
            "@type": "Organization",
            name: input.name,
            ...(input.email ? { email: input.email } : {}),
            ...(input.telephone ? { telephone: input.telephone } : {}),
          },
        }
      : {}),
  };
}

/**
 * Serialise a JSON-LD node for a `<script type="application/ld+json">`.
 *
 * `<` is escaped because a `</script>` sequence inside any string would end the
 * script block early and dump the rest of the JSON into the page as HTML. This
 * is the one escaping that genuinely matters here.
 */
export function serializeJsonLd(node: unknown): string {
  return JSON.stringify(node).replace(/</g, "\\u003c");
}

/* ------------------------------ SEO checklist ----------------------------- */

export type ChecklistInput = {
  /** The focus keyword the owner entered, if any. */
  focusKeyword?: string;
  title: string;
  /** The H1 or the first heading in the body. */
  h1?: string;
  slug: string;
  metaDescription: string;
  /** Plain-text body, used for first-paragraph and word-count checks. */
  bodyText: string;
  /** Alt text of every image in the body. Empty strings count as missing. */
  imageAlts: string[];
  /** Internal links found in the body. */
  internalLinks: number;
};

export type ChecklistItem = {
  id: string;
  label: string;
  passed: boolean;
  /** Shown when it fails: what to do about it. */
  hint: string;
  weight: number;
};

export type ChecklistResult = {
  score: number;
  items: ChecklistItem[];
  passed: number;
  total: number;
};

/**
 * Score a piece of content against the on-page checklist (MVP.md §6.2).
 *
 * Deterministic and pure so the editor can run it on every keystroke and the
 * tests can pin the behaviour. Weights sum to 100.
 */
export function scoreContent(input: ChecklistInput): ChecklistResult {
  const keyword = (input.focusKeyword ?? "").trim().toLowerCase();
  const title = input.title.toLowerCase();
  const h1 = (input.h1 ?? "").toLowerCase();
  const slug = input.slug.toLowerCase();
  const description = input.metaDescription.trim();
  const body = input.bodyText.replace(/\s+/g, " ").trim();
  const firstParagraph = body.slice(0, 300).toLowerCase();
  const words = body.length === 0 ? 0 : body.split(" ").filter(Boolean).length;

  const hasKeyword = keyword.length > 0;

  const items: ChecklistItem[] = [
    {
      id: "keyword-title",
      label: "Focus keyword in the title",
      passed: hasKeyword && title.includes(keyword),
      hint: hasKeyword
        ? "Work the focus keyword into the SEO title."
        : "Set a focus keyword first.",
      weight: 12,
    },
    {
      id: "keyword-h1",
      label: "Focus keyword in the H1",
      passed: hasKeyword && h1.includes(keyword),
      hint: "Add a heading in the body that contains the focus keyword.",
      weight: 10,
    },
    {
      id: "keyword-slug",
      label: "Focus keyword in the URL slug",
      passed: hasKeyword && slug.includes(keyword.replace(/\s+/g, "-")),
      hint: "Shorten the slug so it contains the keyword.",
      weight: 8,
    },
    {
      id: "keyword-first-para",
      label: "Focus keyword in the first paragraph",
      passed: hasKeyword && firstParagraph.includes(keyword),
      hint: "Mention the keyword in the opening paragraph.",
      weight: 10,
    },
    {
      id: "title-length",
      label: "Title length is right",
      passed: titleLengthState(input.title) === "good",
      hint: `Aim for 25–${TITLE_SOFT_MAX} characters so it is not truncated.`,
      weight: 10,
    },
    {
      id: "description-length",
      label: "Meta description length is right",
      passed: descriptionLengthState(description) === "good",
      hint: `Aim for ${DESCRIPTION_SOFT_MIN}–${DESCRIPTION_SOFT_MAX} characters.`,
      weight: 12,
    },
    {
      id: "description-present",
      label: "Meta description is written",
      passed: description.length > 0,
      hint: "Write a description; an auto-excerpt is weaker than a deliberate one.",
      weight: 8,
    },
    {
      id: "image-alts",
      label: "Every image has alt text",
      passed:
        input.imageAlts.length > 0 && input.imageAlts.every((alt) => alt.trim().length > 0),
      hint:
        input.imageAlts.length === 0
          ? "Add at least one image with descriptive alt text."
          : "Some images are missing alt text.",
      weight: 12,
    },
    {
      id: "word-count",
      label: "Enough content",
      passed: words >= 300,
      hint: "Under 300 words is thin for a ranking page.",
      weight: 10,
    },
    {
      id: "internal-links",
      label: "At least one internal link",
      passed: input.internalLinks >= 1,
      hint: "Link to a related page or post.",
      weight: 8,
    },
  ];

  const total = items.reduce((sum, item) => sum + item.weight, 0);
  const earned = items.reduce((sum, item) => sum + (item.passed ? item.weight : 0), 0);
  const passed = items.filter((item) => item.passed).length;

  return {
    score: total === 0 ? 0 : Math.round((earned / total) * 100),
    items,
    passed,
    total: items.length,
  };
}

/** A short label for the score, used in the editor badge. */
export function scoreLabel(score: number): "poor" | "ok" | "good" {
  if (score >= 80) return "good";
  if (score >= 50) return "ok";
  return "poor";
}
