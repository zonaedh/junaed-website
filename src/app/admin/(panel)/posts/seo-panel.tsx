"use client";

import { useMemo, useState } from "react";
import {
  DESCRIPTION_SOFT_MAX,
  TITLE_SOFT_MAX,
  scoreContent,
  scoreLabel,
  titleLengthState,
  descriptionLengthState,
} from "@/lib/seo/core";

/**
 * Live SERP preview and on-page score for the post editor (MVP.md §6.2).
 *
 * Pure client component: it imports only `@/lib/seo/core`, which has no
 * database or Node dependency, so nothing server-only leaks into the bundle
 * (the same rule as D-025).
 *
 * The score is recomputed on every keystroke. It is deliberately advisory —
 * nothing here blocks saving a post. A checklist that refuses to save is a
 * checklist people route around.
 */

const FIELD =
  "w-full rounded-[10px] border border-line bg-white px-3 py-2 text-sm outline-none focus:border-violet-400";

function counterClass(state: string): string {
  if (state === "good") return "text-emerald-700";
  if (state === "empty") return "text-muted";
  return "text-amber-700";
}

export function SeoPanel({
  initialTitle,
  initialDescription,
  initialFocusKeyword,
  slug,
  siteHost,
  bodyText,
  imageAlts,
  internalLinks,
}: {
  initialTitle: string;
  initialDescription: string;
  initialFocusKeyword: string;
  slug: string;
  siteHost: string;
  /** Plain-text body, passed in from the editor so the score is real. */
  bodyText: string;
  imageAlts: string[];
  internalLinks: number;
}) {
  const [seoTitle, setSeoTitle] = useState(initialTitle);
  const [seoDescription, setSeoDescription] = useState(initialDescription);
  const [focusKeyword, setFocusKeyword] = useState(initialFocusKeyword);

  const titleState = titleLengthState(seoTitle);
  const descState = descriptionLengthState(seoDescription);

  const result = useMemo(
    () =>
      scoreContent({
        focusKeyword,
        title: seoTitle,
        h1: bodyText.slice(0, 200),
        slug,
        metaDescription: seoDescription,
        bodyText,
        imageAlts,
        internalLinks,
      }),
    [focusKeyword, seoTitle, seoDescription, slug, bodyText, imageAlts, internalLinks],
  );

  const label = scoreLabel(result.score);
  const badgeClass =
    label === "good"
      ? "bg-emerald-50 text-emerald-700"
      : label === "ok"
        ? "bg-amber-50 text-amber-700"
        : "bg-red-50 text-red-700";

  return (
    <section className="rounded-[16px] border border-line bg-white p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-bold">Search appearance</h2>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-bold ${badgeClass}`}
          title={`${result.passed} of ${result.total} checks passed`}
        >
          SEO {result.score}/100
        </span>
      </div>

      {/* ------------------------- SERP preview ------------------------- */}
      <div className="mb-4 rounded-lg border border-line bg-surface p-3">
        <p className="truncate text-[13px] leading-[1.4] text-[#1a0dab]">
          {seoTitle || "Post title"}
        </p>
        <p className="truncate text-[11px] text-emerald-800">
          {siteHost} › blog › {slug || "your-slug"}
        </p>
        <p className="mt-0.5 line-clamp-2 text-[11px] leading-[1.5] text-muted">
          {seoDescription || "The meta description appears here."}
        </p>
      </div>

      <div className="space-y-3">
        <div>
          <div className="mb-1 flex items-baseline justify-between">
            <label htmlFor="seoTitle" className="text-xs font-bold">
              SEO title
            </label>
            <span className={`text-[11px] ${counterClass(titleState)}`}>
              {seoTitle.length}/{TITLE_SOFT_MAX}
            </span>
          </div>
          <input
            id="seoTitle"
            name="seoTitle"
            value={seoTitle}
            onChange={(event) => setSeoTitle(event.target.value)}
            maxLength={200}
            placeholder="Defaults to the post title"
            className={FIELD}
          />
        </div>

        <div>
          <div className="mb-1 flex items-baseline justify-between">
            <label htmlFor="seoDescription" className="text-xs font-bold">
              Meta description
            </label>
            <span className={`text-[11px] ${counterClass(descState)}`}>
              {seoDescription.length}/{DESCRIPTION_SOFT_MAX}
            </span>
          </div>
          <textarea
            id="seoDescription"
            name="seoDescription"
            rows={2}
            value={seoDescription}
            onChange={(event) => setSeoDescription(event.target.value)}
            maxLength={320}
            className={FIELD}
          />
        </div>

        <div>
          <label htmlFor="focusKeyword" className="mb-1 block text-xs font-bold">
            Focus keyword
          </label>
          <input
            id="focusKeyword"
            name="focusKeyword"
            value={focusKeyword}
            onChange={(event) => setFocusKeyword(event.target.value)}
            maxLength={80}
            placeholder="technical seo"
            className={FIELD}
          />
          <p className="mt-1 text-[11px] text-muted">
            Drives the checklist below. Not shown to visitors.
          </p>
        </div>

        {/* -------------------------- Checklist ------------------------- */}
        <details className="rounded-[10px] border border-line bg-surface px-3 py-2">
          <summary className="cursor-pointer text-xs font-bold">
            {result.passed}/{result.total} checks passed
          </summary>
          <ul className="mt-2 space-y-1.5">
            {result.items.map((item) => (
              <li key={item.id} className="flex items-start gap-2 text-[11px]">
                <span
                  aria-hidden="true"
                  className={item.passed ? "text-emerald-700" : "text-amber-700"}
                >
                  {item.passed ? "✓" : "○"}
                </span>
                <span className={item.passed ? "text-muted" : ""}>
                  {item.label}
                  {!item.passed ? (
                    <span className="block text-muted">{item.hint}</span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </details>
      </div>
    </section>
  );
}
