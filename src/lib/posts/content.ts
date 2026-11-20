/**
 * Post content model — pure, no server imports.
 *
 * A post body is a Tiptap JSON document stored in `posts.content` (JSONB).
 * This file owns three things that must not drift apart:
 *
 *   1. the shape we accept and store,
 *   2. the plain-text projection used for word count, reading time and search,
 *   3. the slug rules.
 *
 * It is deliberately free of `@/db` so the Tiptap editor (a `"use client"`
 * component) can import it without dragging Postgres into the browser bundle
 * (B1, B11).
 */

export type TiptapMark = {
  type: string;
  attrs?: Record<string, unknown>;
};

export type TiptapNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TiptapNode[];
  marks?: TiptapMark[];
  text?: string;
};

export type TiptapDoc = {
  type: "doc";
  content?: TiptapNode[];
};

export const EMPTY_DOC: TiptapDoc = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

/** Average adult reading speed, words per minute. */
const WORDS_PER_MINUTE = 220;

/**
 * Flatten a document to plain text.
 *
 * Used for word count, reading time, the search index and the fallback
 * excerpt. Block nodes contribute a newline so words from adjacent paragraphs
 * do not fuse into one.
 */
export function docToPlainText(doc: TiptapDoc | null | undefined): string {
  if (!doc || !Array.isArray(doc.content)) return "";

  const parts: string[] = [];

  function walk(node: TiptapNode) {
    if (typeof node.text === "string") {
      parts.push(node.text);
    }
    if (Array.isArray(node.content)) {
      for (const child of node.content) walk(child);
    }
    // A hard break and every block boundary end a word.
    if (node.type === "hardBreak" || node.type === "paragraph") {
      parts.push("\n");
    }
  }

  for (const node of doc.content) walk(node);
  return parts.join("").replace(/\n{3,}/g, "\n\n").trim();
}

export function countWords(doc: TiptapDoc | null | undefined): number {
  const text = docToPlainText(doc);
  if (!text) return 0;
  return text.split(/\s+/).filter(Boolean).length;
}

export function readingMinutes(doc: TiptapDoc | null | undefined): number {
  const words = countWords(doc);
  if (words === 0) return 0;
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

/** First N characters of the body, for an excerpt the editor did not write. */
export function autoExcerpt(
  doc: TiptapDoc | null | undefined,
  length = 180,
): string {
  const text = docToPlainText(doc).replace(/\s+/g, " ");
  if (text.length <= length) return text;
  const cut = text.slice(0, length);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > 60 ? lastSpace : length).trimEnd()}…`;
}

/* ---------------------------------- slugs --------------------------------- */

/**
 * Slugify a title.
 *
 * Deliberately conservative: lowercase ASCII words joined by hyphens. Anything
 * that is not a letter or digit is dropped, which keeps URLs stable and avoids
 * percent-encoding in links.
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 200);
}

/**
 * Validate a stored document just enough to render it safely.
 *
 * A JSONB column can hold anything — an older editor version, a hand edit, a
 * failed migration. Rather than trusting it, the renderer walks only the node
 * types it knows and drops the rest. Unknown nodes are skipped, not rendered
 * as raw HTML.
 */
export const RENDERABLE_NODES = new Set([
  "doc",
  "paragraph",
  "heading",
  "text",
  "bulletList",
  "orderedList",
  "listItem",
  "blockquote",
  "codeBlock",
  "horizontalRule",
  "hardBreak",
  "image",
]);

export function isSafeDoc(value: unknown): value is TiptapDoc {
  if (!value || typeof value !== "object") return false;
  const doc = value as TiptapDoc;
  return doc.type === "doc" && (doc.content === undefined || Array.isArray(doc.content));
}

/** Drop nodes the renderer does not know how to draw. */
export function pruneDoc(doc: TiptapDoc): TiptapDoc {
  function prune(node: TiptapNode): TiptapNode | null {
    if (!RENDERABLE_NODES.has(node.type)) return null;
    const next: TiptapNode = { ...node };
    if (Array.isArray(node.content)) {
      next.content = node.content
        .map(prune)
        .filter((child): child is TiptapNode => child !== null);
    }
    return next;
  }

  return {
    type: "doc",
    content: (doc.content ?? [])
      .map(prune)
      .filter((node): node is TiptapNode => node !== null),
  };
}
