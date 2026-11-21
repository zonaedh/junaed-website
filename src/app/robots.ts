import type { MetadataRoute } from "next";
import { getSeoDefaults } from "@/lib/seo/repository";

/**
 * robots.txt for the PUBLIC host only.
 *
 * The admin host returns its own `Disallow: /` robots.txt from `proxy.ts`, so
 * this file never needs to know about admin paths. Admin is additionally
 * protected by an X-Robots-Tag header, which is the part that actually prevents
 * indexing (robots.txt only prevents crawling).
 *
 * The base URL comes from settings now, so a domain change is one field in the
 * admin rather than a code edit.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const seo = await getSeoDefaults();
  const base = seo.siteUrl.replace(/\/+$/, "");

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // /api/ is machine surface, /thank-you is a post-conversion page with no
        // search value, and /admin is blocked at the proxy anyway.
        disallow: ["/api/", "/thank-you", "/admin"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
