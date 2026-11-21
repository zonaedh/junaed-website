import type { MetadataRoute } from "next";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { portfolioItems, posts } from "@/db/schema";
import { getSeoDefaults } from "@/lib/seo/repository";
import { services } from "@/lib/content";

/**
 * Public sitemap (MVP.md §6.1).
 *
 * Dynamic from Phase 6: posts and portfolio items come from the database, so a
 * newly published item appears without a deploy. Three rules keep it honest:
 *
 *  1. Only published, non-deleted rows. A draft in the sitemap is a 404 handed
 *     to a crawler, which is worse than not listing it at all.
 *  2. `noindex` rows are excluded. Listing a page that says "do not index" is a
 *     contradiction and Search Console reports it as an error.
 *  3. `lastModified` is the row's real update time, not `now()`. A sitemap that
 *     claims every page changed today teaches crawlers to ignore the field.
 *
 * Admin routes are never listed — see DECISIONS.md D-012.
 */
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const seo = await getSeoDefaults();
  const base = seo.siteUrl.replace(/\/+$/, "");

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "monthly", priority: 1 },
    { url: `${base}/services`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/portfolio`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/about`, changeFrequency: "yearly", priority: 0.7 },
    { url: `${base}/blog`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${base}/contact`, changeFrequency: "yearly", priority: 0.8 },
    { url: `${base}/privacy-policy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/terms`, changeFrequency: "yearly", priority: 0.3 },
  ];

  const serviceRoutes: MetadataRoute.Sitemap = services.map((service) => ({
    url: `${base}/services/${service.slug}`,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  let postRoutes: MetadataRoute.Sitemap = [];
  let projectRoutes: MetadataRoute.Sitemap = [];

  try {
    const [postRows, projectRows] = await Promise.all([
      db
        .select({
          slug: posts.slug,
          updatedAt: posts.updatedAt,
          publishedAt: posts.publishedAt,
        })
        .from(posts)
        .where(
          and(
            eq(posts.status, "published"),
            eq(posts.noindex, false),
            isNull(posts.deletedAt),
          ),
        ),
      db
        .select({
          slug: portfolioItems.slug,
          updatedAt: portfolioItems.updatedAt,
        })
        .from(portfolioItems)
        .where(
          and(
            eq(portfolioItems.status, "published"),
            eq(portfolioItems.noindex, false),
            isNull(portfolioItems.deletedAt),
          ),
        ),
    ]);

    postRoutes = postRows.map((row) => ({
      url: `${base}/blog/${row.slug}`,
      lastModified: row.updatedAt ?? row.publishedAt ?? undefined,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    }));

    projectRoutes = projectRows.map((row) => ({
      url: `${base}/portfolio/${row.slug}`,
      lastModified: row.updatedAt ?? undefined,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }));
  } catch {
    // A database hiccup must not take the sitemap down entirely: the static
    // routes are still correct and still worth serving.
    postRoutes = [];
    projectRoutes = [];
  }

  return [...staticRoutes, ...serviceRoutes, ...projectRoutes, ...postRoutes];
}
