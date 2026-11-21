"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { savePost, type PostState } from "./actions";
import { PostEditor } from "./post-editor";
import { SeoPanel } from "./seo-panel";
import { MediaPicker } from "@/components/admin/media-picker";
import { slugify, type TiptapDoc } from "@/lib/posts/content";
import type { MediaItem } from "@/lib/media/types";

/**
 * Single post editor (MVP.md §4.1).
 *
 * Layout follows the WordPress shape the brief asks for: title and body on the
 * left, publishing controls and SEO in a right rail. The slug tracks the title
 * until the editor edits it, then it stops — a slug that changes under you
 * after you have set it is how URLs get broken.
 */

const initialState: PostState = { status: "idle" };

const field =
  "w-full rounded-[10px] border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-violet-400 focus:ring-[3px] focus:ring-violet-100";

export function PostForm({
  postId,
  initial,
  categories,
  media,
  adminBase,
  bodyText,
  imageAlts,
  internalLinks,
  siteHost,
}: {
  postId: number | null;
  initial: {
    title: string;
    slug: string;
    excerpt: string;
    content: TiptapDoc;
    status: "draft" | "scheduled" | "published" | "archived";
    publishedAt: string;
    categoryId: number | null;
    tagNames: string[];
    coverMediaId: number | null;
    seoTitle: string;
    seoDescription: string;
    canonicalUrl: string;
    noindex: boolean;
    focusKeyword?: string;
  };
  categories: { id: number; name: string }[];
  media: MediaItem[];
  adminBase: string;
  /** Plain-text body, for the SEO checklist. */
  bodyText: string;
  imageAlts: string[];
  internalLinks: number;
  siteHost: string;
}) {
  const action = savePost.bind(null, postId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const router = useRouter();

  const [title, setTitle] = useState(initial.title);
  const [slug, setSlug] = useState(initial.slug);
  const [slugLocked, setSlugLocked] = useState(initial.slug !== "");
  const [status, setStatus] = useState(initial.status);

  // A new post navigates to its own editor once it exists.
  useEffect(() => {
    if (state.newId) {
      router.push(`${adminBase}/posts/${state.newId}`);
    }
  }, [state.newId, router, adminBase]);

  const effectiveSlug = slugLocked ? slug : slugify(title);
  const slugPreview = effectiveSlug || "your-post-url";

  return (
    <form action={formAction} className="grid gap-5 lg:grid-cols-[1fr_320px]">
      {/* ---------------- main column ---------------- */}
      <div className="space-y-4">
        {state.status === "saved" && state.message ? (
          <div
            role="status"
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
          >
            {state.message}
          </div>
        ) : null}

        {state.status === "error" && state.message ? (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            {state.message}
          </div>
        ) : null}

        <div className="rounded-[16px] border border-line bg-white p-4 sm:p-5">
          <label htmlFor="post-title" className="sr-only">
            Title
          </label>
          <input
            id="post-title"
            name="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Post title"
            maxLength={240}
            className="w-full border-0 border-b border-line pb-3 text-[24px] font-extrabold tracking-[-0.03em] outline-none placeholder:text-muted/50 focus:border-violet-400"
          />
          {state.errors?.title ? (
            <p className="mt-1 text-xs font-semibold text-red-700">
              {state.errors.title}
            </p>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-muted">URL</span>
            <span className="text-muted">/blog/</span>
            <input
              name="slug"
              value={effectiveSlug}
              onChange={(event) => {
                setSlugLocked(true);
                setSlug(slugify(event.target.value));
              }}
              placeholder="your-post-url"
              className="min-w-[180px] flex-1 rounded-md border border-line px-2 py-1 font-mono text-xs outline-none focus:border-violet-400"
            />
            {slugLocked ? (
              <button
                type="button"
                onClick={() => {
                  setSlugLocked(false);
                  setSlug("");
                }}
                className="rounded-md border border-line px-2 py-1 font-bold text-muted hover:text-violet-800"
              >
                Reset from title
              </button>
            ) : (
              <span className="text-muted">follows the title</span>
            )}
          </div>
          {state.errors?.slug ? (
            <p className="mt-1 text-xs font-semibold text-red-700">
              {state.errors.slug}
            </p>
          ) : null}
          <p className="mt-1 text-[11px] text-muted">
            Preview: /blog/{slugPreview}
          </p>
        </div>

        <PostEditor name="content" initialDoc={initial.content} media={media} />
        {state.errors?.content ? (
          <p className="text-xs font-semibold text-red-700">
            {state.errors.content}
          </p>
        ) : null}

        <div className="rounded-[16px] border border-line bg-white p-4 sm:p-5">
          <label htmlFor="excerpt" className="mb-1.5 block text-sm font-bold">
            Excerpt
          </label>
          <textarea
            id="excerpt"
            name="excerpt"
            rows={3}
            defaultValue={initial.excerpt}
            maxLength={600}
            placeholder="One or two sentences. Shown on the blog index and in search results. Left empty, it is generated from the body."
            className={field}
          />
          {state.errors?.excerpt ? (
            <p className="mt-1 text-xs font-semibold text-red-700">
              {state.errors.excerpt}
            </p>
          ) : null}
        </div>

        {/* ---------------- SEO ---------------- */}
        <SeoPanel
          initialTitle={initial.seoTitle}
          initialDescription={initial.seoDescription}
          initialFocusKeyword={initial.focusKeyword ?? ""}
          slug={slug}
          siteHost={siteHost}
          bodyText={bodyText}
          imageAlts={imageAlts}
          internalLinks={internalLinks}
        />

        <section className="rounded-[16px] border border-line bg-white p-4 sm:p-5">
          <h2 className="mb-3 text-sm font-bold">Advanced</h2>
          <div className="space-y-3">
            <div>
              <label
                htmlFor="canonicalUrl"
                className="mb-1 block text-xs font-bold"
              >
                Canonical URL
              </label>
              <input
                id="canonicalUrl"
                name="canonicalUrl"
                defaultValue={initial.canonicalUrl}
                placeholder="Leave empty to use this post's own URL"
                className={field}
              />
            </div>
            <label className="flex items-start gap-2 text-xs">
              <input
                type="checkbox"
                name="noindex"
                defaultChecked={initial.noindex}
                className="mt-0.5 size-4 accent-violet-700"
              />
              <span>
                <span className="block font-bold">Hide from search engines</span>
                <span className="text-muted">
                  Adds noindex. Use for thin or duplicate content.
                </span>
              </span>
            </label>
          </div>
        </section>
      </div>

      {/* ---------------- right rail ---------------- */}
      <aside className="space-y-4">
        <section className="rounded-[16px] border border-line bg-white p-4">
          <h2 className="mb-3 text-sm font-bold">Publish</h2>

          <label htmlFor="status" className="mb-1 block text-xs font-bold">
            Status
          </label>
          <select
            id="status"
            name="status"
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as typeof status)
            }
            className={field}
          >
            <option value="draft">Draft</option>
            <option value="scheduled">Scheduled</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>

          <label
            htmlFor="publishedAt"
            className="mt-3 mb-1 block text-xs font-bold"
          >
            {status === "scheduled" ? "Publish at" : "Publish date"}
          </label>
          <input
            id="publishedAt"
            name="publishedAt"
            type="datetime-local"
            defaultValue={initial.publishedAt}
            className={field}
          />
          {state.errors?.publishedAt ? (
            <p className="mt-1 text-xs font-semibold text-red-700">
              {state.errors.publishedAt}
            </p>
          ) : status === "scheduled" ? (
            <p className="mt-1 text-[11px] text-muted">
              Goes live automatically at this time.
            </p>
          ) : null}

          <button
            type="submit"
            disabled={pending}
            className="mt-4 min-h-10 w-full rounded-lg bg-violet-950 px-4 text-sm font-bold text-white disabled:opacity-50"
          >
            {pending ? "Saving…" : postId === null ? "Create post" : "Save post"}
          </button>

          {postId !== null && initial.status === "published" ? (
            <a
              href={`/blog/${effectiveSlug}`}
              target="_blank"
              rel="noreferrer"
              className="mt-2 block text-center text-xs font-bold text-violet-800 hover:underline"
            >
              View live ↗
            </a>
          ) : null}
        </section>

        <section className="rounded-[16px] border border-line bg-white p-4">
          <h2 className="mb-3 text-sm font-bold">Organise</h2>

          <label htmlFor="categoryId" className="mb-1 block text-xs font-bold">
            Category
          </label>
          <select
            id="categoryId"
            name="categoryId"
            defaultValue={initial.categoryId ? String(initial.categoryId) : ""}
            className={field}
          >
            <option value="">No category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>

          <label htmlFor="tags" className="mt-3 mb-1 block text-xs font-bold">
            Tags
          </label>
          <input
            id="tags"
            name="tags"
            defaultValue={initial.tagNames.join(", ")}
            placeholder="seo, wordpress, pricing"
            className={field}
          />
          <p className="mt-1 text-[11px] text-muted">
            Comma separated. New tags are created automatically.
          </p>
        </section>

        <section className="rounded-[16px] border border-line bg-white p-4">
          <h2 className="mb-3 text-sm font-bold">Featured image</h2>
          <MediaPicker
            name="coverMediaId"
            label="Cover"
            value={initial.coverMediaId ? String(initial.coverMediaId) : ""}
            items={media}
            help="Used on the blog index and as the social preview."
          />
        </section>
      </aside>
    </form>
  );
}
