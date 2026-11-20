"use server";

import { revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  categories,
  posts as postsTable,
  postRevisions,
  postTags,
  tags,
} from "@/db/schema";
import { ACTIONS, logActivity } from "@/lib/audit";
import { getAdminBase } from "@/lib/admin-path";
import { requireRoleOrThrow, UnauthorizedError } from "@/lib/rbac";
import {
  countWords,
  isSafeDoc,
  readingMinutes,
  slugify,
  type TiptapDoc,
} from "@/lib/posts/content";
import { slugTaken } from "@/lib/posts/repository";

/**
 * Post write path (MVP.md §4.1).
 *
 * Notes on the choices here:
 *
 * - **Slug uniqueness is checked on the server**, not trusted from the form.
 *   The column is unique, so a collision would otherwise be a 500.
 * - **Word count and reading time are derived, never submitted.** A client
 *   could post anything; the body is the only input.
 * - **A revision is written before every update**, capped at the last 10. That
 *   is what makes "revert" possible without a separate history table per field.
 * - **`scheduled` is a real status.** The public read filters on
 *   `publishedAt <= now()`, so a scheduled post goes live on time with no job.
 */

export type PostState = {
  status: "idle" | "saved" | "error";
  message?: string;
  errors?: Record<string, string>;
  /** Set after a successful create so the form can navigate to the new id. */
  newId?: number;
};

const MAX_TITLE = 240;
const MAX_EXCERPT = 600;
const MAX_SEO_TITLE = 200;
const MAX_SEO_DESCRIPTION = 320;
const MAX_CANONICAL = 500;
const MAX_TAGS = 12;
const MAX_TAG_LENGTH = 60;
const REVISION_LIMIT = 10;

async function requireEditor() {
  try {
    return await requireRoleOrThrow("editor");
  } catch (error) {
    if (error instanceof UnauthorizedError) return null;
    throw error;
  }
}

/** Parse the Tiptap JSON the editor submits. */
function parseDoc(raw: FormDataEntryValue | null): TiptapDoc | null {
  if (typeof raw !== "string" || raw.trim() === "") return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isSafeDoc(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Resolve tag names to ids, creating any that do not exist yet. */
async function resolveTags(names: string[]): Promise<number[]> {
  const ids: number[] = [];

  for (const raw of names) {
    const name = raw.trim().slice(0, MAX_TAG_LENGTH);
    if (!name) continue;
    const slug = slugify(name);
    if (!slug) continue;

    const existing = await db
      .select({ id: tags.id })
      .from(tags)
      .where(eq(tags.slug, slug))
      .limit(1);

    if (existing[0]) {
      ids.push(existing[0].id);
      continue;
    }

    const inserted = await db
      .insert(tags)
      .values({ name, slug })
      .onConflictDoNothing({ target: tags.slug })
      .returning({ id: tags.id });

    if (inserted[0]) {
      ids.push(inserted[0].id);
    } else {
      // Lost a race with a concurrent insert; read it back.
      const again = await db
        .select({ id: tags.id })
        .from(tags)
        .where(eq(tags.slug, slug))
        .limit(1);
      if (again[0]) ids.push(again[0].id);
    }
  }

  return [...new Set(ids)];
}

export async function savePost(
  postId: number | null,
  _prev: PostState,
  formData: FormData,
): Promise<PostState> {
  const user = await requireEditor();
  if (!user) {
    return { status: "error", message: "Your session has expired. Sign in again." };
  }

  const errors: Record<string, string> = {};

  const title = String(formData.get("title") ?? "").trim();
  if (!title) errors.title = "A title is required.";
  else if (title.length > MAX_TITLE) {
    errors.title = `Title must be ${MAX_TITLE} characters or fewer.`;
  }

  // Slug: use what was typed, else derive from the title.
  const rawSlug = String(formData.get("slug") ?? "").trim();
  const slug = slugify(rawSlug || title);
  if (!slug) errors.slug = "Could not build a URL from that title. Set one manually.";
  else if (postId !== null && (await slugTaken(slug, postId))) {
    errors.slug = "Another post already uses that URL.";
  } else if (postId === null && (await slugTaken(slug))) {
    errors.slug = "Another post already uses that URL.";
  }

  const doc = parseDoc(formData.get("content"));
  if (!doc) errors.content = "The post body could not be read. Try saving again.";

  const excerpt = String(formData.get("excerpt") ?? "").trim();
  if (excerpt.length > MAX_EXCERPT) {
    errors.excerpt = `Excerpt must be ${MAX_EXCERPT} characters or fewer.`;
  }

  const seoTitle = String(formData.get("seoTitle") ?? "").trim();
  const seoDescription = String(formData.get("seoDescription") ?? "").trim();
  const canonicalUrl = String(formData.get("canonicalUrl") ?? "").trim();
  if (seoTitle.length > MAX_SEO_TITLE) {
    errors.seoTitle = `SEO title must be ${MAX_SEO_TITLE} characters or fewer.`;
  }
  if (seoDescription.length > MAX_SEO_DESCRIPTION) {
    errors.seoDescription = `Meta description must be ${MAX_SEO_DESCRIPTION} characters or fewer.`;
  }
  if (canonicalUrl.length > MAX_CANONICAL) {
    errors.canonicalUrl = "That canonical URL is too long.";
  }

  const rawStatus = String(formData.get("status") ?? "draft");
  const allowed = ["draft", "scheduled", "published", "archived"] as const;
  const status = (allowed as readonly string[]).includes(rawStatus)
    ? (rawStatus as (typeof allowed)[number])
    : "draft";

  // A scheduled post needs a time, or it can never become visible.
  const publishedAtRaw = String(formData.get("publishedAt") ?? "").trim();
  let publishedAt: Date | null = null;
  if (publishedAtRaw) {
    const parsed = new Date(publishedAtRaw);
    if (Number.isNaN(parsed.getTime())) {
      errors.publishedAt = "That publish date could not be read.";
    } else {
      publishedAt = parsed;
    }
  }
  if (status === "scheduled" && !publishedAt) {
    errors.publishedAt = "A scheduled post needs a publish date and time.";
  }
  if (status === "published" && !publishedAt) {
    publishedAt = new Date();
  }

  const rawCategory = String(formData.get("categoryId") ?? "").trim();
  const categoryId = /^\d+$/.test(rawCategory) ? Number(rawCategory) : null;

  const rawCover = String(formData.get("coverMediaId") ?? "").trim();
  const coverMediaId = /^\d+$/.test(rawCover) ? Number(rawCover) : null;

  const noindex = formData.get("noindex") === "on";

  const tagNames = String(formData.get("tags") ?? "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, MAX_TAGS);

  if (Object.keys(errors).length > 0) {
    return {
      status: "error",
      message: "Some fields need attention before this can be saved.",
      errors,
    };
  }

  const words = countWords(doc);
  const minutes = readingMinutes(doc);

  try {
    if (postId === null) {
      const inserted = await db
        .insert(postsTable)
        .values({
          title,
          slug,
          excerpt: excerpt || null,
          content: doc,
          coverMediaId,
          categoryId,
          authorId: user.id,
          status,
          publishedAt,
          readingMinutes: minutes,
          wordCount: words,
          seoTitle: seoTitle || null,
          seoDescription: seoDescription || null,
          canonicalUrl: canonicalUrl || null,
          noindex,
        })
        .returning({ id: postsTable.id });

      const newId = inserted[0]?.id;
      if (!newId) throw new Error("Insert returned no id.");

      const tagIds = await resolveTags(tagNames);
      if (tagIds.length > 0) {
        await db
          .insert(postTags)
          .values(tagIds.map((tagId) => ({ postId: newId, tagId })))
          .onConflictDoNothing();
      }

      revalidateTag("posts", { expire: 0 });

      await logActivity({
        userId: user.id,
        action: ACTIONS.postCreated,
        entity: "post",
        entityId: newId,
        meta: { status, slug },
      });

      return { status: "saved", message: "Post created.", newId };
    }

    // ---- update: snapshot the previous version first ----
    const previous = await db
      .select({ title: postsTable.title, content: postsTable.content })
      .from(postsTable)
      .where(eq(postsTable.id, postId))
      .limit(1);

    if (previous[0]) {
      await db.insert(postRevisions).values({
        postId,
        title: previous[0].title,
        content: previous[0].content,
        createdBy: user.id,
      });

      // Keep only the last N revisions.
      const revisions = await db
        .select({ id: postRevisions.id })
        .from(postRevisions)
        .where(eq(postRevisions.postId, postId))
        .orderBy(postRevisions.id);

      if (revisions.length > REVISION_LIMIT) {
        const excess = revisions.slice(0, revisions.length - REVISION_LIMIT);
        for (const revision of excess) {
          await db.delete(postRevisions).where(eq(postRevisions.id, revision.id));
        }
      }
    }

    await db
      .update(postsTable)
      .set({
        title,
        slug,
        excerpt: excerpt || null,
        content: doc,
        coverMediaId,
        categoryId,
        status,
        publishedAt,
        readingMinutes: minutes,
        wordCount: words,
        seoTitle: seoTitle || null,
        seoDescription: seoDescription || null,
        canonicalUrl: canonicalUrl || null,
        noindex,
        updatedAt: new Date(),
      })
      .where(eq(postsTable.id, postId));

    // Replace the tag set wholesale — simplest correct behaviour.
    await db.delete(postTags).where(eq(postTags.postId, postId));
    const tagIds = await resolveTags(tagNames);
    if (tagIds.length > 0) {
      await db
        .insert(postTags)
        .values(tagIds.map((tagId) => ({ postId, tagId })))
        .onConflictDoNothing();
    }

    revalidateTag("posts", { expire: 0 });
    revalidateTag(`post:${slug}`, { expire: 0 });

    await logActivity({
      userId: user.id,
      action: ACTIONS.postUpdated,
      entity: "post",
      entityId: postId,
      meta: { status, slug, words },
    });

    return { status: "saved", message: "Post saved." };
  } catch (error) {
    console.error("[posts] save failed", error);
    return {
      status: "error",
      message: "Could not save this post. Please try again.",
    };
  }
}

/** Publish/unpublish from the list screen. */
export async function setPostStatus(
  postId: number,
  status: "draft" | "published" | "archived",
): Promise<void> {
  const user = await requireRoleOrThrow("editor");

  const rows = await db
    .select({ slug: postsTable.slug, publishedAt: postsTable.publishedAt })
    .from(postsTable)
    .where(eq(postsTable.id, postId))
    .limit(1);

  const row = rows[0];
  if (!row) return;

  await db
    .update(postsTable)
    .set({
      status,
      publishedAt:
        status === "published" ? (row.publishedAt ?? new Date()) : row.publishedAt,
      updatedAt: new Date(),
    })
    .where(eq(postsTable.id, postId));

  revalidateTag("posts", { expire: 0 });
  revalidateTag(`post:${row.slug}`, { expire: 0 });

  await logActivity({
    userId: user.id,
    action: ACTIONS.postUpdated,
    entity: "post",
    entityId: postId,
    meta: { status },
  });

  redirect(`${await getAdminBase()}/posts`);
}

/** Soft delete — the Trash keeps it for 30 days (MVP.md §4.2). */
export async function deletePost(postId: number): Promise<void> {
  const user = await requireRoleOrThrow("editor");

  const rows = await db
    .select({ slug: postsTable.slug })
    .from(postsTable)
    .where(eq(postsTable.id, postId))
    .limit(1);

  await db
    .update(postsTable)
    .set({ deletedAt: new Date(), status: "archived" })
    .where(eq(postsTable.id, postId));

  revalidateTag("posts", { expire: 0 });
  if (rows[0]) revalidateTag(`post:${rows[0].slug}`, { expire: 0 });

  await logActivity({
    userId: user.id,
    action: ACTIONS.postDeleted,
    entity: "post",
    entityId: postId,
  });

  redirect(`${await getAdminBase()}/posts`);
}

/** Category management. */
export async function createCategory(name: string): Promise<void> {
  const user = await requireRoleOrThrow("editor");
  const trimmed = name.trim().slice(0, 120);
  const slug = slugify(trimmed);
  if (!trimmed || !slug) return;

  await db
    .insert(categories)
    .values({ name: trimmed, slug })
    .onConflictDoNothing({ target: categories.slug });

  revalidateTag("posts", { expire: 0 });
  await logActivity({
    userId: user.id,
    action: ACTIONS.categoryCreated,
    entity: "category",
    entityId: slug,
  });
}
