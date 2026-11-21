/**
 * Metadata builder — one function every public page calls.
 *
 * The point is that no page hand-rolls its own `openGraph`/`twitter` block.
 * When they do, one of them always ends up missing a canonical or shipping a
 * relative image URL, and nobody notices for months. Here the defaults come
 * from settings, the page supplies only what it actually knows, and the
 * fallback chain is written down once.
 *
 * SERVER ONLY (reads settings from the database).
 */

import type { Metadata } from "next";
import { getSeoDefaults, verificationMetadata, type SeoDefaults } from "./repository";
import { absoluteUrl, applyTitleTemplate, canonicalPath } from "./core";

export type PageSeoInput = {
  /** The page's own title, before the template. */
  title: string;
  /** Description. Falls back to the site default when absent. */
  description?: string;
  /** Site-relative path, e.g. `/blog/hello`. Used for canonical and og:url. */
  path: string;
  /** Absolute or site-relative image. Falls back to the default share image. */
  image?: string;
  imageAlt?: string;
  /** When true the page is excluded from indexing. */
  noindex?: boolean;
  /** `article` for posts, `website` for everything else. */
  type?: "website" | "article";
  publishedTime?: string;
  modifiedTime?: string;
  authors?: string[];
  /** Overrides the site-wide title template for this page only. */
  titleTemplate?: string;
  /** Extra keywords, rarely useful but cheap to support. */
  keywords?: string[];
};

/**
 * Resolve an image reference to an absolute URL.
 *
 * A relative upload path (`/uploads/x.webp`) must become absolute or the social
 * card silently fails: Open Graph requires an absolute URL and most crawlers
 * will not resolve a relative one.
 */
function resolveImage(
  image: string | undefined,
  defaults: SeoDefaults,
): string | undefined {
  const candidate = (image ?? "").trim() || defaults.defaultOgImage.trim();
  if (!candidate) return undefined;
  if (/^https?:\/\//i.test(candidate)) return candidate;
  return absoluteUrl(defaults.siteUrl, candidate);
}

export async function buildMetadata(input: PageSeoInput): Promise<Metadata> {
  const defaults = await getSeoDefaults();

  const template = input.titleTemplate ?? defaults.titleTemplate;
  const fullTitle = applyTitleTemplate(input.title, template);
  const description =
    (input.description ?? "").trim() || defaults.defaultDescription;
  const canonical = canonicalPath(input.path);
  const url = absoluteUrl(defaults.siteUrl, canonical);
  const image = resolveImage(input.image, defaults);
  const imageAlt = input.imageAlt?.trim() || input.title;

  const twitterHandle = defaults.twitterHandle.trim();

  return {
    // `absolute` because this function already applied the template. Without
    // it, the root layout's template would run a second time and produce
    // "About | Junaed Hossain | Junaed Hossain".
    title: { absolute: fullTitle },
    description,
    keywords: input.keywords,
    alternates: { canonical },
    robots: input.noindex
      ? { index: false, follow: false }
      : { index: true, follow: true },
    openGraph: {
      title: fullTitle,
      description,
      url,
      siteName: defaults.siteName,
      locale: "en_US",
      type: input.type ?? "website",
      ...(image ? { images: [{ url: image, alt: imageAlt }] } : {}),
      ...(input.type === "article" && input.publishedTime
        ? { publishedTime: input.publishedTime }
        : {}),
      ...(input.type === "article" && input.modifiedTime
        ? { modifiedTime: input.modifiedTime }
        : {}),
      ...(input.type === "article" && input.authors
        ? { authors: input.authors }
        : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: fullTitle,
      description,
      ...(twitterHandle ? { site: twitterHandle, creator: twitterHandle } : {}),
      ...(image ? { images: [image] } : {}),
    },
    verification: verificationMetadata(defaults),
  };
}

/**
 * Metadata for the root layout.
 *
 * The root cannot call `buildMetadata` for its own title — it *defines* the
 * template that every child uses — but it does own `metadataBase`, verification
 * codes and the default social card.
 */
export async function buildRootMetadata(): Promise<Metadata> {
  const defaults = await getSeoDefaults();

  return {
    metadataBase: new URL(defaults.siteUrl),
    title: {
      default: `${defaults.siteName} — ${defaults.siteDescription}`.slice(0, 70),
      template: defaults.titleTemplate,
    },
    description: defaults.defaultDescription,
    applicationName: defaults.siteName,
    authors: [{ name: defaults.siteName, url: defaults.siteUrl }],
    creator: defaults.siteName,
    formatDetection: { telephone: false, address: false, email: false },
    openGraph: {
      type: "website",
      siteName: defaults.siteName,
      locale: "en_US",
      title: defaults.siteName,
      description: defaults.defaultDescription,
      url: defaults.siteUrl,
      ...(defaults.defaultOgImage
        ? {
            images: [
              {
                url: resolveImage(defaults.defaultOgImage, defaults) ?? "",
                alt: defaults.siteName,
              },
            ],
          }
        : {}),
    },
    twitter: {
      card: defaults.defaultOgImage ? "summary_large_image" : "summary",
      title: defaults.siteName,
      description: defaults.defaultDescription,
      ...(defaults.twitterHandle
        ? { site: defaults.twitterHandle, creator: defaults.twitterHandle }
        : {}),
    },
    verification: verificationMetadata(defaults),
  };
}
