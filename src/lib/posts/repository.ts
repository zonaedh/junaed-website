/**
 * Posts repository — cached public reads, uncached admin reads.
 *
 * SERVER ONLY. A `"use client"` file must import `./content` instead.
 */

import { unstable_cache } from "next/cache";
import { and, desc, eq, isNull, lte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  categories,
  media,
  posts as postsTable,
  postTags,
  tags,
  users,
} from "@/db/schema";
import {
  autoExcerpt,
  isSafeDoc,
  pruneDoc,
  type TiptapDoc,
} from "./content";

export type PostStatus = "draft" | "scheduled" | "published" | "archived";

export type PostListItem = {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  status: PostStatus;
  categoryName: string | null;
  categorySlug: string | null;
  /**
   * ISO string, not a Date.
   *
   * These come out of `unstable_cache`, which serialises its result — a Date
   * becomes a string on the way back. Typing it as Date made the type lie and
   * crashed the prerender with "toISOString is not a function". Normalising to
   * ISO here means every consumer gets what the type promises.
   */
  publishedAt: string | null;
  readingMinutes: number;
  wordCount: number;
  coverUrl: string | null;
  coverAlt: string;
  updatedAt: string;
};

export type PostDetail = PostListItem & {
  content: TiptapDoc;
  seoTitle: string;
  seoDescription: string;
  canonicalUrl: string;
  noindex: boolean;
  authorName: string | null;
  tagNames: string[];
};

/**
 * A post is publicly visible when it is published and its publish time has
 * passed. Scheduled posts become visible without any cron job because the
 * condition is evaluated on read — the GitHub Action in MVP.md §4.1 only needs
 * to warm the cache, not to flip a flag.
 */
function publicCondition() {
  return and(
    eq(postsTable.status, "published"),
    isNull(postsTable.deletedAt),
    or(isNull(postsTable.publishedAt), lte(postsTable.publishedAt, new Date())),
  );
}

function coverJoin() {
  return {
    coverUrl: media.url,
    coverAlt: media.alt,
  };
}

/** Public list, cached. Tagged `posts` so a publish invalidates it. */
export const listPublishedPosts = unstable_cache(
  async (limit = 50): Promise<PostListItem[]> => {
    const rows = await db
      .select({
        id: postsTable.id,
        title: postsTable.title,
        slug: postsTable.slug,
        excerpt: postsTable.excerpt,
        status: postsTable.status,
        publishedAt: postsTable.publishedAt,
        readingMinutes: postsTable.readingMinutes,
        wordCount: postsTable.wordCount,
        updatedAt: postsTable.updatedAt,
        content: postsTable.content,
        categoryName: categories.name,
        categorySlug: categories.slug,
        ...coverJoin(),
      })
      .from(postsTable)
      .leftJoin(categories, eq(postsTable.categoryId, categories.id))
      .leftJoin(media, eq(postsTable.coverMediaId, media.id))
      .where(publicCondition())
      .orderBy(desc(postsTable.publishedAt))
      .limit(limit);

    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      slug: row.slug,
      excerpt:
        row.excerpt?.trim() ||
        autoExcerpt(isSafeDoc(row.content) ? row.content : null),
      status: row.status as PostStatus,
      categoryName: row.categoryName,
      categorySlug: row.categorySlug,
      publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
      readingMinutes: row.readingMinutes ?? 0,
      wordCount: row.wordCount ?? 0,
      coverUrl: row.coverUrl,
      coverAlt: row.coverAlt?.trim() ?? "",
      updatedAt: row.updatedAt.toISOString(),
    }));
  },
  ["published-posts"],
  { tags: ["posts"], revalidate: false },
);

/** Public single post by slug, cached per slug. */
export function getPublishedPost(slug: string) {
  return unstable_cache(
    async (): Promise<PostDetail | null> => {
      const rows = await db
        .select({
          id: postsTable.id,
          title: postsTable.title,
          slug: postsTable.slug,
          excerpt: postsTable.excerpt,
          status: postsTable.status,
          publishedAt: postsTable.publishedAt,
          readingMinutes: postsTable.readingMinutes,
          wordCount: postsTable.wordCount,
          updatedAt: postsTable.updatedAt,
          content: postsTable.content,
          seoTitle: postsTable.seoTitle,
          seoDescription: postsTable.seoDescription,
          canonicalUrl: postsTable.canonicalUrl,
          noindex: postsTable.noindex,
          categoryName: categories.name,
          categorySlug: categories.slug,
          authorName: users.name,
          ...coverJoin(),
        })
        .from(postsTable)
        .leftJoin(categories, eq(postsTable.categoryId, categories.id))
        .leftJoin(users, eq(postsTable.authorId, users.id))
        .leftJoin(media, eq(postsTable.coverMediaId, media.id))
        .where(and(eq(postsTable.slug, slug), publicCondition()))
        .limit(1);

      const row = rows[0];
      if (!row) return null;

      const tagRows = await db
        .select({ name: tags.name })
        .from(postTags)
        .innerJoin(tags, eq(postTags.tagId, tags.id))
        .where(eq(postTags.postId, row.id));

      const doc = isSafeDoc(row.content) ? pruneDoc(row.content) : { type: "doc" as const };

      return {
        id: row.id,
        title: row.title,
        slug: row.slug,
        excerpt:
          row.excerpt?.trim() || autoExcerpt(doc),
        status: row.status as PostStatus,
        categoryName: row.categoryName,
        categorySlug: row.categorySlug,
        publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
        readingMinutes: row.readingMinutes ?? 0,
        wordCount: row.wordCount ?? 0,
        coverUrl: row.coverUrl,
        coverAlt: row.coverAlt?.trim() ?? "",
        updatedAt: row.updatedAt.toISOString(),
        content: doc,
        seoTitle: row.seoTitle ?? "",
        seoDescription: row.seoDescription ?? "",
        canonicalUrl: row.canonicalUrl ?? "",
        noindex: row.noindex,
        authorName: row.authorName,
        tagNames: tagRows.map((tag) => tag.name),
      };
    },
    ["published-post", slug],
    { tags: ["posts", `post:${slug}`], revalidate: false },
  )();
}

/** Slugs for generateStaticParams. */
export async function listPublishedSlugs(): Promise<string[]> {
  const rows = await db
    .select({ slug: postsTable.slug })
    .from(postsTable)
    .where(publicCondition());
  return rows.map((row) => row.slug);
}

/* --------------------------------- admin ---------------------------------- */

export type AdminPostRow = {
  id: number;
  title: string;
  slug: string;
  status: PostStatus;
  categoryName: string | null;
  publishedAt: Date | null;
  updatedAt: Date;
  authorName: string | null;
};

/** Uncached — the admin list must show the real state. */
export async function listPostsForAdmin(): Promise<AdminPostRow[]> {
  const rows = await db
    .select({
      id: postsTable.id,
      title: postsTable.title,
      slug: postsTable.slug,
      status: postsTable.status,
      publishedAt: postsTable.publishedAt,
      updatedAt: postsTable.updatedAt,
      categoryName: categories.name,
      authorName: users.name,
    })
    .from(postsTable)
    .leftJoin(categories, eq(postsTable.categoryId, categories.id))
    .leftJoin(users, eq(postsTable.authorId, users.id))
    .where(isNull(postsTable.deletedAt))
    .orderBy(desc(postsTable.updatedAt));

  return rows.map((row) => ({
    ...row,
    status: row.status as PostStatus,
  }));
}

export type EditablePost = {
  id: number | null;
  title: string;
  slug: string;
  excerpt: string;
  content: TiptapDoc;
  status: PostStatus;
  publishedAt: string;
  categoryId: number | null;
  tagNames: string[];
  coverMediaId: number | null;
  seoTitle: string;
  seoDescription: string;
  canonicalUrl: string;
  focusKeyword: string;
  noindex: boolean;
};

export async function getPostForEdit(id: number): Promise<EditablePost | null> {
  const rows = await db
    .select()
    .from(postsTable)
    .where(and(eq(postsTable.id, id), isNull(postsTable.deletedAt)))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  const tagRows = await db
    .select({ name: tags.name })
    .from(postTags)
    .innerJoin(tags, eq(postTags.tagId, tags.id))
    .where(eq(postTags.postId, row.id));

  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt ?? "",
    content: isSafeDoc(row.content) ? row.content : { type: "doc" },
    status: row.status as PostStatus,
    publishedAt: row.publishedAt
      ? row.publishedAt.toISOString().slice(0, 16)
      : "",
    categoryId: row.categoryId,
    tagNames: tagRows.map((tag) => tag.name),
    coverMediaId: row.coverMediaId,
    seoTitle: row.seoTitle ?? "",
    seoDescription: row.seoDescription ?? "",
    canonicalUrl: row.canonicalUrl ?? "",
    focusKeyword: row.focusKeyword ?? "",
    noindex: row.noindex,
  };
}

export async function listCategories() {
  return db
    .select({ id: categories.id, name: categories.name, slug: categories.slug })
    .from(categories)
    .orderBy(categories.name);
}

export async function listTags() {
  return db
    .select({ id: tags.id, name: tags.name, slug: tags.slug })
    .from(tags)
    .orderBy(tags.name);
}

/** Does this slug already belong to another post? */
export async function slugTaken(slug: string, exceptId?: number): Promise<boolean> {
  const rows = await db
    .select({ id: postsTable.id })
    .from(postsTable)
    .where(
      exceptId
        ? and(eq(postsTable.slug, slug), sql`${postsTable.id} <> ${exceptId}`)
        : eq(postsTable.slug, slug),
    )
    .limit(1);
  return rows.length > 0;
}

/** Counts for the dashboard and the posts list header. */
export async function postCounts() {
  const rows = await db
    .select({ status: postsTable.status, count: sql<number>`count(*)::int` })
    .from(postsTable)
    .where(isNull(postsTable.deletedAt))
    .groupBy(postsTable.status);

  const counts = { draft: 0, scheduled: 0, published: 0, archived: 0 };
  for (const row of rows) {
    counts[row.status as PostStatus] = row.count;
  }
  return counts;
}
