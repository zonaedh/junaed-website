/**
 * Portfolio repository — cached public reads, uncached admin reads.
 *
 * SERVER ONLY.
 */

import { unstable_cache } from "next/cache";
import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { media, portfolioItems } from "@/db/schema";
import { isSafeDoc, pruneDoc, type TiptapDoc } from "@/lib/posts/content";

export type PortfolioStatus = "draft" | "scheduled" | "published" | "archived";

export type PortfolioCard = {
  id: number;
  title: string;
  slug: string;
  summary: string;
  tags: string[];
  client: string;
  year: string;
  isFeatured: boolean;
  coverUrl: string | null;
  coverAlt: string;
  results: { label: string; value: string }[];
};

export type PortfolioDetail = PortfolioCard & {
  content: TiptapDoc;
  galleryUrls: { url: string; alt: string }[];
  externalUrl: string;
  seoTitle: string;
  seoDescription: string;
  noindex: boolean;
};

function publicCondition() {
  return and(
    eq(portfolioItems.status, "published"),
    isNull(portfolioItems.deletedAt),
  );
}

/** Public list, ordered by the editor's sort order. */
export const listPublishedPortfolio = unstable_cache(
  async (): Promise<PortfolioCard[]> => {
    const rows = await db
      .select({
        id: portfolioItems.id,
        title: portfolioItems.title,
        slug: portfolioItems.slug,
        summary: portfolioItems.summary,
        tags: portfolioItems.tags,
        client: portfolioItems.client,
        year: portfolioItems.year,
        isFeatured: portfolioItems.isFeatured,
        results: portfolioItems.results,
        coverUrl: media.url,
        coverAlt: media.alt,
      })
      .from(portfolioItems)
      .leftJoin(media, eq(portfolioItems.coverMediaId, media.id))
      .where(publicCondition())
      .orderBy(asc(portfolioItems.sortOrder), desc(portfolioItems.createdAt));

    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      slug: row.slug,
      summary: row.summary ?? "",
      tags: Array.isArray(row.tags) ? row.tags : [],
      client: row.client ?? "",
      year: row.year ?? "",
      isFeatured: row.isFeatured,
      coverUrl: row.coverUrl,
      coverAlt: row.coverAlt?.trim() ?? "",
      results: Array.isArray(row.results) ? row.results : [],
    }));
  },
  ["published-portfolio"],
  { tags: ["portfolio"], revalidate: false },
);

/** Featured items for the home page. */
export const listFeaturedPortfolio = unstable_cache(
  async (limit = 3): Promise<PortfolioCard[]> => {
    const all = await listPublishedPortfolio();
    const featured = all.filter((item) => item.isFeatured);
    return (featured.length > 0 ? featured : all).slice(0, limit);
  },
  ["featured-portfolio"],
  { tags: ["portfolio"], revalidate: false },
);

export function getPublishedPortfolioItem(slug: string) {
  return unstable_cache(
    async (): Promise<PortfolioDetail | null> => {
      const rows = await db
        .select({
          id: portfolioItems.id,
          title: portfolioItems.title,
          slug: portfolioItems.slug,
          summary: portfolioItems.summary,
          tags: portfolioItems.tags,
          client: portfolioItems.client,
          year: portfolioItems.year,
          isFeatured: portfolioItems.isFeatured,
          results: portfolioItems.results,
          content: portfolioItems.content,
          gallery: portfolioItems.gallery,
          externalUrl: portfolioItems.externalUrl,
          seoTitle: portfolioItems.seoTitle,
          seoDescription: portfolioItems.seoDescription,
          noindex: portfolioItems.noindex,
          coverUrl: media.url,
          coverAlt: media.alt,
        })
        .from(portfolioItems)
        .leftJoin(media, eq(portfolioItems.coverMediaId, media.id))
        .where(and(eq(portfolioItems.slug, slug), publicCondition()))
        .limit(1);

      const row = rows[0];
      if (!row) return null;

      const galleryIds = Array.isArray(row.gallery) ? row.gallery : [];
      let galleryUrls: { url: string; alt: string }[] = [];
      if (galleryIds.length > 0) {
        const galleryRows = await db
          .select({ id: media.id, url: media.url, alt: media.alt, title: media.title })
          .from(media)
          .where(
            and(
              isNull(media.deletedAt),
              sql`${media.id} = ANY(${galleryIds})`,
            ),
          );
        const byId = new Map(galleryRows.map((item) => [item.id, item]));
        galleryUrls = galleryIds
          .map((id) => byId.get(id))
          .filter((item): item is NonNullable<typeof item> => Boolean(item))
          .map((item) => ({
            url: item.url,
            alt: item.alt?.trim() || item.title?.trim() || "",
          }));
      }

      return {
        id: row.id,
        title: row.title,
        slug: row.slug,
        summary: row.summary ?? "",
        tags: Array.isArray(row.tags) ? row.tags : [],
        client: row.client ?? "",
        year: row.year ?? "",
        isFeatured: row.isFeatured,
        coverUrl: row.coverUrl,
        coverAlt: row.coverAlt?.trim() ?? "",
        results: Array.isArray(row.results) ? row.results : [],
        content: isSafeDoc(row.content) ? pruneDoc(row.content) : { type: "doc" },
        galleryUrls,
        externalUrl: row.externalUrl ?? "",
        seoTitle: row.seoTitle ?? "",
        seoDescription: row.seoDescription ?? "",
        noindex: row.noindex,
      };
    },
    ["published-portfolio-item", slug],
    { tags: ["portfolio", `portfolio:${slug}`], revalidate: false },
  )();
}

/* --------------------------------- admin ---------------------------------- */

export type AdminPortfolioRow = {
  id: number;
  title: string;
  slug: string;
  status: PortfolioStatus;
  isFeatured: boolean;
  sortOrder: number;
  year: string;
  updatedAt: Date;
};

export async function listPortfolioForAdmin(): Promise<AdminPortfolioRow[]> {
  const rows = await db
    .select({
      id: portfolioItems.id,
      title: portfolioItems.title,
      slug: portfolioItems.slug,
      status: portfolioItems.status,
      isFeatured: portfolioItems.isFeatured,
      sortOrder: portfolioItems.sortOrder,
      year: portfolioItems.year,
      updatedAt: portfolioItems.updatedAt,
    })
    .from(portfolioItems)
    .where(isNull(portfolioItems.deletedAt))
    .orderBy(asc(portfolioItems.sortOrder), desc(portfolioItems.createdAt));

  return rows.map((row) => ({
    ...row,
    status: row.status as PortfolioStatus,
    year: row.year ?? "",
  }));
}

export type EditablePortfolio = {
  id: number | null;
  title: string;
  slug: string;
  summary: string;
  content: TiptapDoc;
  status: PortfolioStatus;
  client: string;
  year: string;
  externalUrl: string;
  tagsText: string;
  results: { label: string; value: string }[];
  coverMediaId: number | null;
  gallery: number[];
  isFeatured: boolean;
  sortOrder: number;
  seoTitle: string;
  seoDescription: string;
  noindex: boolean;
};

export async function getPortfolioForEdit(
  id: number,
): Promise<EditablePortfolio | null> {
  const rows = await db
    .select()
    .from(portfolioItems)
    .where(and(eq(portfolioItems.id, id), isNull(portfolioItems.deletedAt)))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    summary: row.summary ?? "",
    content: isSafeDoc(row.content) ? row.content : { type: "doc" },
    status: row.status as PortfolioStatus,
    client: row.client ?? "",
    year: row.year ?? "",
    externalUrl: row.externalUrl ?? "",
    tagsText: Array.isArray(row.tags) ? row.tags.join(", ") : "",
    results: Array.isArray(row.results) ? row.results : [],
    coverMediaId: row.coverMediaId,
    gallery: Array.isArray(row.gallery) ? row.gallery : [],
    isFeatured: row.isFeatured,
    sortOrder: row.sortOrder,
    seoTitle: row.seoTitle ?? "",
    seoDescription: row.seoDescription ?? "",
    noindex: row.noindex,
  };
}

export async function portfolioSlugTaken(
  slug: string,
  exceptId?: number,
): Promise<boolean> {
  const rows = await db
    .select({ id: portfolioItems.id })
    .from(portfolioItems)
    .where(
      exceptId
        ? and(
            eq(portfolioItems.slug, slug),
            sql`${portfolioItems.id} <> ${exceptId}`,
          )
        : eq(portfolioItems.slug, slug),
    )
    .limit(1);
  return rows.length > 0;
}

export async function listPortfolioSlugs(): Promise<string[]> {
  const rows = await db
    .select({ slug: portfolioItems.slug })
    .from(portfolioItems)
    .where(publicCondition());
  return rows.map((row) => row.slug);
}
