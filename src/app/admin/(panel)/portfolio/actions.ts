"use server";

import { revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { portfolioItems } from "@/db/schema";
import { ACTIONS, logActivity } from "@/lib/audit";
import { getAdminBase } from "@/lib/admin-path";
import { requireRoleOrThrow, UnauthorizedError } from "@/lib/rbac";
import { isSafeDoc, slugify, type TiptapDoc } from "@/lib/posts/content";
import { portfolioSlugTaken } from "@/lib/portfolio/repository";

/**
 * Portfolio write path (MVP.md §4.2).
 *
 * Same rules as posts: role re-checked server-side, slug uniqueness enforced
 * here rather than trusted from the form, and the cache tag invalidated so the
 * public pages update on the next request.
 */

export type PortfolioState = {
  status: "idle" | "saved" | "error";
  message?: string;
  errors?: Record<string, string>;
  newId?: number;
};

const MAX_TITLE = 240;
const MAX_SUMMARY = 600;
const MAX_CLIENT = 160;
const MAX_YEAR = 8;
const MAX_EXTERNAL = 500;
const MAX_RESULTS = 8;

async function requireEditor() {
  try {
    return await requireRoleOrThrow("editor");
  } catch (error) {
    if (error instanceof UnauthorizedError) return null;
    throw error;
  }
}

function parseDoc(raw: FormDataEntryValue | null): TiptapDoc | null {
  if (typeof raw !== "string" || raw.trim() === "") return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isSafeDoc(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Results arrive as parallel label[]/value[] arrays from the repeatable rows. */
function parseResults(formData: FormData): { label: string; value: string }[] {
  const labels = formData.getAll("resultLabel").map(String);
  const values = formData.getAll("resultValue").map(String);
  const results: { label: string; value: string }[] = [];

  for (let index = 0; index < labels.length; index += 1) {
    const label = labels[index]?.trim();
    const value = values[index]?.trim();
    if (!label || !value) continue;
    results.push({ label: label.slice(0, 80), value: value.slice(0, 80) });
    if (results.length >= MAX_RESULTS) break;
  }

  return results;
}

/** Gallery ids arrive as repeated `gallery` entries. */
function parseGallery(formData: FormData): number[] {
  return formData
    .getAll("gallery")
    .map((entry) => String(entry).trim())
    .filter((entry) => /^\d+$/.test(entry))
    .map(Number)
    .slice(0, 20);
}

export async function savePortfolioItem(
  itemId: number | null,
  _prev: PortfolioState,
  formData: FormData,
): Promise<PortfolioState> {
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

  const rawSlug = String(formData.get("slug") ?? "").trim();
  const slug = slugify(rawSlug || title);
  if (!slug) errors.slug = "Could not build a URL from that title. Set one manually.";
  else if (await portfolioSlugTaken(slug, itemId ?? undefined)) {
    errors.slug = "Another project already uses that URL.";
  }

  const summary = String(formData.get("summary") ?? "").trim();
  if (summary.length > MAX_SUMMARY) {
    errors.summary = `Summary must be ${MAX_SUMMARY} characters or fewer.`;
  }

  const doc = parseDoc(formData.get("content"));
  if (!doc) errors.content = "The case study body could not be read. Try again.";

  const client = String(formData.get("client") ?? "").trim();
  if (client.length > MAX_CLIENT) errors.client = "Client name is too long.";

  const year = String(formData.get("year") ?? "").trim();
  if (year.length > MAX_YEAR) errors.year = "Year must be 8 characters or fewer.";

  const externalUrl = String(formData.get("externalUrl") ?? "").trim();
  if (externalUrl.length > MAX_EXTERNAL) {
    errors.externalUrl = "That URL is too long.";
  } else if (externalUrl && !/^https?:\/\//i.test(externalUrl)) {
    errors.externalUrl = "Use a full URL starting with http:// or https://";
  }

  const rawStatus = String(formData.get("status") ?? "draft");
  const allowed = ["draft", "scheduled", "published", "archived"] as const;
  const status = (allowed as readonly string[]).includes(rawStatus)
    ? (rawStatus as (typeof allowed)[number])
    : "draft";

  const rawCover = String(formData.get("coverMediaId") ?? "").trim();
  const coverMediaId = /^\d+$/.test(rawCover) ? Number(rawCover) : null;

  const isFeatured = formData.get("isFeatured") === "on";
  const noindex = formData.get("noindex") === "on";

  const rawSort = String(formData.get("sortOrder") ?? "0").trim();
  const sortOrder = Number.isFinite(Number(rawSort)) ? Number(rawSort) : 0;

  const tags = String(formData.get("tags") ?? "")
    .split(",")
    .map((tag) => tag.trim().slice(0, 40))
    .filter(Boolean)
    .slice(0, 8);

  if (Object.keys(errors).length > 0) {
    return {
      status: "error",
      message: "Some fields need attention before this can be saved.",
      errors,
    };
  }

  const values = {
    title,
    slug,
    summary: summary || null,
    content: doc,
    coverMediaId,
    gallery: parseGallery(formData),
    client: client || null,
    year: year || null,
    externalUrl: externalUrl || null,
    tags,
    results: parseResults(formData),
    isFeatured,
    sortOrder,
    status,
    seoTitle: String(formData.get("seoTitle") ?? "").trim() || null,
    seoDescription: String(formData.get("seoDescription") ?? "").trim() || null,
    noindex,
    updatedAt: new Date(),
  };

  try {
    if (itemId === null) {
      const inserted = await db
        .insert(portfolioItems)
        .values(values)
        .returning({ id: portfolioItems.id });

      const newId = inserted[0]?.id;
      if (!newId) throw new Error("Insert returned no id.");

      revalidateTag("portfolio", { expire: 0 });

      await logActivity({
        userId: user.id,
        action: ACTIONS.portfolioCreated,
        entity: "portfolio",
        entityId: newId,
        meta: { status, slug },
      });

      return { status: "saved", message: "Project created.", newId };
    }

    await db
      .update(portfolioItems)
      .set(values)
      .where(eq(portfolioItems.id, itemId));

    revalidateTag("portfolio", { expire: 0 });
    revalidateTag(`portfolio:${slug}`, { expire: 0 });

    await logActivity({
      userId: user.id,
      action: ACTIONS.portfolioUpdated,
      entity: "portfolio",
      entityId: itemId,
      meta: { status, slug },
    });

    return { status: "saved", message: "Project saved." };
  } catch (error) {
    console.error("[portfolio] save failed", error);
    return {
      status: "error",
      message: "Could not save this project. Please try again.",
    };
  }
}

/** Persist a new order from the drag-to-reorder list. */
export async function reorderPortfolio(orderedIds: number[]): Promise<void> {
  const user = await requireRoleOrThrow("editor");

  for (let index = 0; index < orderedIds.length; index += 1) {
    const id = orderedIds[index];
    if (!Number.isFinite(id)) continue;
    await db
      .update(portfolioItems)
      .set({ sortOrder: index, updatedAt: new Date() })
      .where(eq(portfolioItems.id, id));
  }

  revalidateTag("portfolio", { expire: 0 });

  await logActivity({
    userId: user.id,
    action: ACTIONS.portfolioReordered,
    entity: "portfolio",
    meta: { count: orderedIds.length },
  });
}

export async function setPortfolioStatus(
  itemId: number,
  status: "draft" | "published" | "archived",
): Promise<void> {
  const user = await requireRoleOrThrow("editor");

  const rows = await db
    .select({ slug: portfolioItems.slug })
    .from(portfolioItems)
    .where(eq(portfolioItems.id, itemId))
    .limit(1);

  await db
    .update(portfolioItems)
    .set({ status, updatedAt: new Date() })
    .where(eq(portfolioItems.id, itemId));

  revalidateTag("portfolio", { expire: 0 });
  if (rows[0]) revalidateTag(`portfolio:${rows[0].slug}`, { expire: 0 });

  await logActivity({
    userId: user.id,
    action: ACTIONS.portfolioUpdated,
    entity: "portfolio",
    entityId: itemId,
    meta: { status },
  });

  redirect(`${await getAdminBase()}/portfolio`);
}

export async function togglePortfolioFeatured(itemId: number): Promise<void> {
  const user = await requireRoleOrThrow("editor");

  await db
    .update(portfolioItems)
    .set({
      isFeatured: sql`NOT ${portfolioItems.isFeatured}`,
      updatedAt: new Date(),
    })
    .where(eq(portfolioItems.id, itemId));

  revalidateTag("portfolio", { expire: 0 });

  await logActivity({
    userId: user.id,
    action: ACTIONS.portfolioUpdated,
    entity: "portfolio",
    entityId: itemId,
    meta: { field: "isFeatured" },
  });

  redirect(`${await getAdminBase()}/portfolio`);
}

/** Soft delete — Trash for 30 days, then purge (MVP.md §4.2). */
export async function deletePortfolioItem(itemId: number): Promise<void> {
  const user = await requireRoleOrThrow("editor");

  const rows = await db
    .select({ slug: portfolioItems.slug })
    .from(portfolioItems)
    .where(eq(portfolioItems.id, itemId))
    .limit(1);

  await db
    .update(portfolioItems)
    .set({ deletedAt: new Date(), status: "archived" })
    .where(eq(portfolioItems.id, itemId));
  revalidateTag("portfolio", { expire: 0 });
  if (rows[0]) revalidateTag(`portfolio:${rows[0].slug}`, { expire: 0 });

  await logActivity({
    userId: user.id,
    action: ACTIONS.portfolioDeleted,
    entity: "portfolio",
    entityId: itemId,
  });

  redirect(`${await getAdminBase()}/portfolio`);
}
