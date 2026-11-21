import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { posts } from "@/db/schema";
import { getSeoDefaults } from "@/lib/seo/repository";
import { absoluteUrl } from "@/lib/seo/core";

/**
 * Blog RSS feed (MVP.md §6.1).
 *
 * A route handler rather than a metadata file because RSS is not one of Next's
 * generated metadata routes. Escaping is done by hand: an unescaped `&` in a
 * title is the single most common way a feed becomes unreadable to a parser.
 */
export const revalidate = 3600;

/** XML-escape text content and attribute values. */
function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const seo = await getSeoDefaults();
  const base = seo.siteUrl.replace(/\/+$/, "");

  let rows: {
    title: string;
    slug: string;
    excerpt: string | null;
    publishedAt: Date | null;
    updatedAt: Date;
  }[] = [];

  try {
    rows = await db
      .select({
        title: posts.title,
        slug: posts.slug,
        excerpt: posts.excerpt,
        publishedAt: posts.publishedAt,
        updatedAt: posts.updatedAt,
      })
      .from(posts)
      .where(
        and(
          eq(posts.status, "published"),
          eq(posts.noindex, false),
          isNull(posts.deletedAt),
        ),
      )
      .orderBy(desc(posts.publishedAt))
      .limit(50);
  } catch {
    rows = [];
  }

  const items = rows
    .map((row) => {
      const url = absoluteUrl(base, `/blog/${row.slug}`);
      const published = row.publishedAt ?? row.updatedAt ?? new Date();
      return `    <item>
      <title>${escapeXml(row.title)}</title>
      <link>${escapeXml(url)}</link>
      <guid isPermaLink="true">${escapeXml(url)}</guid>
      <description>${escapeXml(row.excerpt?.trim() || row.title)}</description>
      <pubDate>${new Date(published).toUTCString()}</pubDate>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(seo.siteName)} — Blog</title>
    <link>${escapeXml(absoluteUrl(base, "/blog"))}</link>
    <description>${escapeXml(seo.defaultDescription)}</description>
    <language>en</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${escapeXml(absoluteUrl(base, "/rss.xml"))}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "content-type": "application/rss+xml; charset=utf-8",
      "cache-control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
