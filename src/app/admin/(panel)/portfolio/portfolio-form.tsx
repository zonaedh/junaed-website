"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { savePortfolioItem, type PortfolioState } from "./actions";
import { PostEditor } from "../posts/post-editor";
import { MediaPicker } from "@/components/admin/media-picker";
import { slugify, type TiptapDoc } from "@/lib/posts/content";
import type { MediaItem } from "@/lib/media/types";

/**
 * Portfolio item form (MVP.md §4.2).
 *
 * Results are repeatable label/value rows — that is the "at a glance" block on
 * the case study page. They are submitted as parallel arrays and paired up on
 * the server, which keeps the form a plain FormData POST.
 */

const initialState: PortfolioState = { status: "idle" };

const field =
  "w-full rounded-[10px] border border-line bg-white px-3 py-2 text-sm outline-none transition focus:border-violet-400 focus:ring-[3px] focus:ring-violet-100";

export function PortfolioForm({
  itemId,
  initial,
  media,
  adminBase,
}: {
  itemId: number | null;
  initial: {
    title: string;
    slug: string;
    summary: string;
    content: TiptapDoc;
    status: "draft" | "scheduled" | "published" | "archived";
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
  media: MediaItem[];
  adminBase: string;
}) {
  const action = savePortfolioItem.bind(null, itemId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const router = useRouter();

  const [title, setTitle] = useState(initial.title);
  const [slug, setSlug] = useState(initial.slug);
  const [slugLocked, setSlugLocked] = useState(initial.slug !== "");
  const [results, setResults] = useState(
    initial.results.length > 0 ? initial.results : [{ label: "", value: "" }],
  );

  useEffect(() => {
    if (state.newId) router.push(`${adminBase}/portfolio/${state.newId}`);
  }, [state.newId, router, adminBase]);

  const effectiveSlug = slugLocked ? slug : slugify(title);

  return (
    <form action={formAction} className="grid gap-5 lg:grid-cols-[1fr_320px]">
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
          <label htmlFor="pf-title" className="sr-only">
            Title
          </label>
          <input
            id="pf-title"
            name="title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Project title"
            maxLength={240}
            className="w-full border-0 border-b border-line pb-3 text-[24px] font-extrabold tracking-[-0.03em] outline-none placeholder:text-muted/50 focus:border-violet-400"
          />
          {state.errors?.title ? (
            <p className="mt-1 text-xs font-semibold text-red-700">
              {state.errors.title}
            </p>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-muted">/portfolio/</span>
            <input
              name="slug"
              value={effectiveSlug}
              onChange={(event) => {
                setSlugLocked(true);
                setSlug(slugify(event.target.value));
              }}
              placeholder="project-url"
              className="min-w-[160px] flex-1 rounded-md border border-line px-2 py-1 font-mono text-xs outline-none focus:border-violet-400"
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
            ) : null}
          </div>
          {state.errors?.slug ? (
            <p className="mt-1 text-xs font-semibold text-red-700">
              {state.errors.slug}
            </p>
          ) : null}
        </div>

        <div className="rounded-[16px] border border-line bg-white p-4 sm:p-5">
          <label htmlFor="summary" className="mb-1.5 block text-sm font-bold">
            Summary
          </label>
          <textarea
            id="summary"
            name="summary"
            rows={3}
            defaultValue={initial.summary}
            maxLength={600}
            placeholder="One or two sentences for the portfolio grid and the case study intro."
            className={field}
          />
          {state.errors?.summary ? (
            <p className="mt-1 text-xs font-semibold text-red-700">
              {state.errors.summary}
            </p>
          ) : null}
        </div>

        <PostEditor name="content" initialDoc={initial.content} media={media} />
        {state.errors?.content ? (
          <p className="text-xs font-semibold text-red-700">
            {state.errors.content}
          </p>
        ) : null}

        {/* -------- results -------- */}
        <section className="rounded-[16px] border border-line bg-white p-4 sm:p-5">
          <h2 className="mb-1 text-sm font-bold">At a glance</h2>
          <p className="mb-3 text-xs text-muted">
            Label and value pairs shown beside the case study. Leave both blank
            to skip a row.
          </p>

          <div className="space-y-2">
            {results.map((row, index) => (
              <div key={index} className="flex gap-2">
                <input
                  name="resultLabel"
                  defaultValue={row.label}
                  placeholder="Label (e.g. Indexed pages)"
                  className={field}
                />
                <input
                  name="resultValue"
                  defaultValue={row.value}
                  placeholder="Value (e.g. +3.4×)"
                  className={field}
                />
                <button
                  type="button"
                  onClick={() =>
                    setResults((current) =>
                      current.length === 1
                        ? [{ label: "", value: "" }]
                        : current.filter((_, position) => position !== index),
                    )
                  }
                  aria-label="Remove row"
                  className="shrink-0 rounded-lg border border-line px-2.5 text-xs font-bold text-muted hover:border-red-200 hover:text-red-700"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() =>
              setResults((current) =>
                current.length >= 8
                  ? current
                  : [...current, { label: "", value: "" }],
              )
            }
            className="mt-2 min-h-8 rounded-lg border border-line px-3 text-xs font-bold text-[#5e5a6b] hover:border-violet-200 hover:text-violet-800"
          >
            Add row
          </button>
        </section>

        <section className="rounded-[16px] border border-line bg-white p-4 sm:p-5">
          <h2 className="mb-3 text-sm font-bold">Search appearance</h2>
          <div className="space-y-3">
            <div>
              <label htmlFor="seoTitle" className="mb-1 block text-xs font-bold">
                SEO title
              </label>
              <input
                id="seoTitle"
                name="seoTitle"
                defaultValue={initial.seoTitle}
                maxLength={200}
                className={field}
              />
            </div>
            <div>
              <label
                htmlFor="seoDescription"
                className="mb-1 block text-xs font-bold"
              >
                Meta description
              </label>
              <textarea
                id="seoDescription"
                name="seoDescription"
                rows={2}
                defaultValue={initial.seoDescription}
                maxLength={320}
                className={field}
              />
            </div>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                name="noindex"
                defaultChecked={initial.noindex}
                className="size-4 accent-violet-700"
              />
              <span className="font-bold">Hide from search engines</span>
            </label>
          </div>
        </section>
      </div>

      {/* -------- right rail -------- */}
      <aside className="space-y-4">
        <section className="rounded-[16px] border border-line bg-white p-4">
          <h2 className="mb-3 text-sm font-bold">Publish</h2>

          <label htmlFor="status" className="mb-1 block text-xs font-bold">
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={initial.status}
            className={field}
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>

          <label className="mt-3 flex items-start gap-2 text-xs">
            <input
              type="checkbox"
              name="isFeatured"
              defaultChecked={initial.isFeatured}
              className="mt-0.5 size-4 accent-violet-700"
            />
            <span>
              <span className="block font-bold">Featured</span>
              <span className="text-muted">
                Shown in the home page Selected work section.
              </span>
            </span>
          </label>

          <label htmlFor="sortOrder" className="mt-3 mb-1 block text-xs font-bold">
            Sort order
          </label>
          <input
            id="sortOrder"
            name="sortOrder"
            type="number"
            defaultValue={initial.sortOrder}
            className={field}
          />
          <p className="mt-1 text-[11px] text-muted">
            Lower numbers appear first. Drag to reorder on the list screen.
          </p>

          <button
            type="submit"
            disabled={pending}
            className="mt-4 min-h-10 w-full rounded-lg bg-violet-950 px-4 text-sm font-bold text-white disabled:opacity-50"
          >
            {pending
              ? "Saving…"
              : itemId === null
                ? "Create project"
                : "Save project"}
          </button>

          {itemId !== null && initial.status === "published" ? (
            <a
              href={`/portfolio/${effectiveSlug}`}
              target="_blank"
              rel="noreferrer"
              className="mt-2 block text-center text-xs font-bold text-violet-800 hover:underline"
            >
              View live ↗
            </a>
          ) : null}
        </section>

        <section className="rounded-[16px] border border-line bg-white p-4">
          <h2 className="mb-3 text-sm font-bold">Details</h2>

          <label htmlFor="client" className="mb-1 block text-xs font-bold">
            Client
          </label>
          <input
            id="client"
            name="client"
            defaultValue={initial.client}
            maxLength={160}
            className={field}
          />

          <label htmlFor="year" className="mt-3 mb-1 block text-xs font-bold">
            Year
          </label>
          <input
            id="year"
            name="year"
            defaultValue={initial.year}
            maxLength={8}
            placeholder="2026"
            className={field}
          />

          <label htmlFor="tags" className="mt-3 mb-1 block text-xs font-bold">
            Focus / tags
          </label>
          <input
            id="tags"
            name="tags"
            defaultValue={initial.tagsText}
            placeholder="SEO, Optimization"
            className={field}
          />

          <label
            htmlFor="externalUrl"
            className="mt-3 mb-1 block text-xs font-bold"
          >
            External link
          </label>
          <input
            id="externalUrl"
            name="externalUrl"
            defaultValue={initial.externalUrl}
            placeholder="https://"
            className={field}
          />
          {state.errors?.externalUrl ? (
            <p className="mt-1 text-xs font-semibold text-red-700">
              {state.errors.externalUrl}
            </p>
          ) : null}
        </section>

        <section className="rounded-[16px] border border-line bg-white p-4">
          <h2 className="mb-3 text-sm font-bold">Cover image</h2>
          <MediaPicker
            name="coverMediaId"
            label="Cover"
            value={initial.coverMediaId ? String(initial.coverMediaId) : ""}
            items={media}
            help="Shown on the portfolio grid and the case study header."
          />
        </section>

        <section className="rounded-[16px] border border-line bg-white p-4">
          <h2 className="mb-1 text-sm font-bold">Gallery</h2>
          <p className="mb-3 text-xs text-muted">
            Additional images shown in the case study. Add one at a time.
          </p>
          <GalleryField initial={initial.gallery} media={media} />
        </section>
      </aside>
    </form>
  );
}

/**
 * Gallery ids as repeated hidden inputs.
 *
 * A plain multi-select would be unusable with thumbnails, so this keeps an
 * array in state and renders one hidden input per id — same FormData shape,
 * better control.
 */
function GalleryField({
  initial,
  media,
}: {
  initial: number[];
  media: MediaItem[];
}) {
  const [ids, setIds] = useState<number[]>(initial);
  const [adding, setAdding] = useState(false);

  return (
    <div>
      {ids.map((id) => (
        <input key={id} type="hidden" name="gallery" value={id} />
      ))}

      {ids.length > 0 ? (
        <ul className="mb-2 grid grid-cols-3 gap-2">
          {ids.map((id) => {
            const item = media.find((entry) => entry.id === id);
            return (
              <li key={id} className="relative">
                <span className="block aspect-square overflow-hidden rounded-lg bg-surface">
                  {item?.thumbUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.thumbUrl}
                      alt={item.alt || item.title}
                      className="size-full object-cover"
                    />
                  ) : null}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setIds((current) => current.filter((entry) => entry !== id))
                  }
                  aria-label="Remove from gallery"
                  className="absolute top-1 right-1 grid size-5 place-items-center rounded-full bg-violet-950/85 text-[11px] font-bold text-white"
                >
                  ×
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mb-2 text-xs text-muted">No gallery images yet.</p>
      )}

      {adding ? (
        <div>
          <MediaPicker
            name="__galleryPick"
            label="Add image"
            value=""
            items={media}
          />
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => {
                const input = document.querySelector<HTMLInputElement>(
                  'input[name="__galleryPick"]',
                );
                const value = Number(input?.value);
                if (Number.isFinite(value) && value > 0 && !ids.includes(value)) {
                  setIds((current) => [...current, value]);
                }
                setAdding(false);
              }}
              className="min-h-8 rounded-lg bg-violet-950 px-3 text-xs font-bold text-white"
            >
              Add
            </button>            <button
              type="button"
              onClick={() => setAdding(false)}
              className="min-h-8 rounded-lg border border-line px-3 text-xs font-bold"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          disabled={ids.length >= 20}
          className="min-h-8 rounded-lg border border-line px-3 text-xs font-bold text-[#5e5a6b] hover:border-violet-200 hover:text-violet-800 disabled:opacity-40"
        >
          Add image
        </button>
      )}
    </div>
  );
}
