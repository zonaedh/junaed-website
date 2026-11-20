/**
 * Image processing — validate by content, strip metadata, normalise.
 *
 * SERVER ONLY (sharp is a native module).
 *
 * Two rules drive everything here:
 *
 * 1. **Trust the bytes, not the filename.** A `.png` that is really an HTML
 *    file is the oldest upload attack there is. The declared MIME and the
 *    extension are both ignored; the magic bytes decide.
 * 2. **Strip metadata.** A phone photo carries GPS coordinates, a camera
 *    serial and often the photographer's name. Re-encoding through sharp with
 *    no `withMetadata()` call drops all of it, which is the behaviour we want
 *    and the reason we never pass the original buffer through.
 */

import sharp from "sharp";
import {
  ALLOWED_MIME,
  MAX_IMAGE_WIDTH,
  THUMB_WIDTH,
  type AllowedMime,
} from "./types";

export type ProcessedImage = {
  /** Normalised full-size bytes. */
  body: Buffer;
  mime: string;
  extension: string;
  width: number;
  height: number;
  /** WebP thumbnail for the admin grid. */
  thumb: Buffer;
};

export type ProcessedFile = {
  body: Buffer;
  mime: string;
  extension: string;
  width: number | null;
  height: number | null;
  thumb: Buffer | null;
};

/** Detect the real type from the first bytes of the file. */
export function detectMime(buffer: Buffer): AllowedMime | null {
  if (buffer.length < 12) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return "image/png";
  }
  // RIFF....WEBP
  if (
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  // ISO-BMFF: ....ftypavif  (avif) — box size then 'ftyp'
  if (buffer.toString("ascii", 4, 8) === "ftyp") {
    const brand = buffer.toString("ascii", 8, 12);
    if (brand === "avif" || brand === "avis") return "image/avif";
  }
  // PDF: %PDF-
  if (buffer.toString("ascii", 0, 5) === "%PDF-") {
    return "application/pdf";
  }
  // SVG: text, so look for a root <svg element in the head of the file.
  const head = buffer.toString("utf8", 0, Math.min(buffer.length, 4096));
  if (/<svg[\s>]/i.test(head)) return "image/svg+xml";

  return null;
}

/**
 * Remove anything executable from an SVG.
 *
 * An SVG is a document that can carry <script>, event handlers and external
 * references. Rasterising it would be safer but would throw away the reason
 * someone uploaded a vector in the first place, so it is sanitised instead:
 * script elements, event attributes, javascript: URLs and foreignObject are
 * all removed.
 */
export function sanitiseSvg(source: string): string {
  return (
    source
      // <script>...</script> and self-closing <script/>
      .replace(/<script[\s\S]*?<\/script\s*>/gi, "")
      .replace(/<script\b[^>]*\/>/gi, "")
      // <foreignObject> can embed arbitrary HTML
      .replace(/<foreignObject[\s\S]*?<\/foreignObject\s*>/gi, "")
      // on*="..." event handlers
      .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, "")
      .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, "")
      .replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, "")
      // javascript: and data: URLs in href/xlink:href
      .replace(/(href\s*=\s*["'])\s*(?:javascript|data):[^"']*/gi, "$1#")
  );
}

function extensionFor(mime: string): string {
  switch (mime) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/avif":
      return "avif";
    case "image/svg+xml":
      return "svg";
    case "application/pdf":
      return "pdf";
    default:
      return "bin";
  }
}

/** Extension for a stored object, derived from the MIME we actually detected. */
export function extensionForMime(mime: string): string {
  return extensionFor(mime);
}

/**
 * Normalise an uploaded file.
 *
 * Raster images become WebP at a capped width — one format, one quality
 * setting, predictable bytes. SVG is sanitised and kept vector. PDF is stored
 * untouched (it is a document, not an image, and re-encoding it would be
 * destructive).
 */
export async function processUpload(buffer: Buffer): Promise<ProcessedFile> {
  const mime = detectMime(buffer);
  if (!mime || !(ALLOWED_MIME as readonly string[]).includes(mime)) {
    throw new Error("Unsupported file type.");
  }

  if (mime === "application/pdf") {
    return {
      body: buffer,
      mime,
      extension: "pdf",
      width: null,
      height: null,
      thumb: null,
    };
  }

  if (mime === "image/svg+xml") {
    const clean = Buffer.from(sanitiseSvg(buffer.toString("utf8")), "utf8");
    // Rasterise only for the thumbnail; the stored file stays vector.
    let thumb: Buffer | null = null;
    let width: number | null = null;
    let height: number | null = null;
    try {
      const meta = await sharp(clean).metadata();
      width = meta.width ?? null;
      height = meta.height ?? null;
      thumb = await sharp(clean)
        .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer();
    } catch {
      // A vector sharp cannot rasterise is still a valid file to store.
      thumb = null;
    }
    return { body: clean, mime, extension: "svg", width, height, thumb };
  }

  const image = sharp(buffer, { failOn: "error" }).rotate();
  const meta = await image.metadata();

  const resized = image.resize({
    width: MAX_IMAGE_WIDTH,
    withoutEnlargement: true,
  });

  // No withMetadata() call: that is what strips EXIF, GPS and ICC profiles.
  const body = await resized.webp({ quality: 82 }).toBuffer();
  const finalMeta = await sharp(body).metadata();

  const thumb = await sharp(buffer)
    .rotate()
    .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();

  return {
    body,
    mime: "image/webp",
    extension: "webp",
    width: finalMeta.width ?? meta.width ?? null,
    height: finalMeta.height ?? meta.height ?? null,
    thumb,
  };
}
