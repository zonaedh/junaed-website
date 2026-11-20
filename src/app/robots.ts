import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

/**
 * robots.txt for the PUBLIC host only.
 *
 * The admin host returns its own `Disallow: /` robots.txt from `proxy.ts`,
 * so this file never needs to know about admin paths. Admin is additionally
 * protected by an X-Robots-Tag header, which is the part that actually
 * prevents indexing (robots.txt only prevents crawling).
 */
export default function robots(): MetadataRoute.Robots {
  const base = site.url.replace(/\/$/, "");

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/thank-you"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
