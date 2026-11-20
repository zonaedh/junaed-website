/**
 * Media types and limits — pure, no server imports.
 *
 * A `"use client"` component must be able to import this file without pulling
 * `@/db` or the S3 client into the browser bundle (B1, B11). Keep it free of
 * any server-only dependency.
 */

/** What the upload endpoint accepts. Checked by content, never by filename. */
export const ALLOWED_IMAGE_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/svg+xml",
] as const;

export const ALLOWED_DOC_MIME = ["application/pdf"] as const;

export const ALLOWED_MIME = [...ALLOWED_IMAGE_MIME, ...ALLOWED_DOC_MIME] as const;

export type AllowedMime = (typeof ALLOWED_MIME)[number];

/** 12 MB. Sharp re-encodes images, so this is generous but bounded. */
export const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;

/** Full-size output is capped at this width; height follows the aspect ratio. */
export const MAX_IMAGE_WIDTH = 2000;

/** Thumbnail width for the admin grid. */
export const THUMB_WIDTH = 480;

export type MediaItem = {
  id: number;
  key: string;
  url: string;
  thumbUrl: string | null;
  mime: string;
  size: number;
  width: number | null;
  height: number | null;
  alt: string;
  title: string;
  caption: string;
  folder: string | null;
  createdAt: string;
};

export type MediaUsage = {
  /** Human label, e.g. "Home — hero image". */
  label: string;
  /** Admin path to fix it. */
  href: string;
};

export function isImageMime(mime: string): boolean {
  return mime.startsWith("image/");
}

/** Human-readable size for the admin list. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Strip anything that is not a safe filename character. */
export function slugifyFilename(name: string): string {
  const base = name.replace(/\.[^.]+$/, "");
  const slug = base
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
  return slug || "file";
}
