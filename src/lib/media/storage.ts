/**
 * Media storage — one interface, two drivers.
 *
 * SERVER ONLY. Never import from a `"use client"` file.
 *
 * Why an adapter at all: the media library was blocked for a whole phase
 * waiting on Cloudflare R2 credentials. The upload pipeline, the picker and
 * every image field are identical regardless of where the bytes land, so the
 * only thing that should ever depend on R2 is the driver. With this split the
 * library is fully buildable and verifiable locally against disk, and turning
 * on R2 is a set of environment variables — not a rewrite (D-027).
 *
 * The local driver writes into `public/uploads/`, which Next serves as static
 * files in development. That is deliberately dev-only: Vercel's filesystem is
 * ephemeral, so a production deploy with no R2 configured throws at boot
 * rather than silently losing every upload.
 */

import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

export type StorageDriverName = "local" | "r2";

export type StoredObject = {
  key: string;
  url: string;
};

export type StorageDriver = {
  name: StorageDriverName;
  put(key: string, body: Buffer, contentType: string): Promise<StoredObject>;
  remove(key: string): Promise<void>;
};

/* --------------------------------- local --------------------------------- */

const LOCAL_ROOT = path.join(process.cwd(), "public", "uploads");

function localDriver(): StorageDriver {
  return {
    name: "local",
    async put(key, body) {
      const target = path.join(LOCAL_ROOT, key);
      // Defence in depth: a key must never escape the uploads directory.
      const resolved = path.resolve(target);
      if (!resolved.startsWith(path.resolve(LOCAL_ROOT) + path.sep)) {
        throw new Error("Refusing to write outside the uploads directory.");
      }
      await mkdir(path.dirname(resolved), { recursive: true });
      await writeFile(resolved, body);
      return { key, url: `/uploads/${key.split(path.sep).join("/")}` };
    },
    async remove(key) {
      const target = path.resolve(path.join(LOCAL_ROOT, key));
      if (!target.startsWith(path.resolve(LOCAL_ROOT) + path.sep)) return;
      await unlink(target).catch(() => {
        // Already gone is a success for a delete.
      });
    },
  };
}

/* ----------------------------------- r2 ---------------------------------- */

function r2Config() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;
  const publicUrl = process.env.R2_PUBLIC_URL;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicUrl) {
    return null;
  }
  return { accountId, accessKeyId, secretAccessKey, bucket, publicUrl };
}

export function hasR2Config(): boolean {
  return r2Config() !== null;
}

function r2Driver(): StorageDriver {
  const config = r2Config();
  if (!config) throw new Error("R2 is not configured.");

  const client = new S3Client({
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });

  const base = config.publicUrl.replace(/\/+$/, "");

  return {
    name: "r2",
    async put(key, body, contentType) {
      await client.send(
        new PutObjectCommand({
          Bucket: config.bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
          // Content is immutable: the key carries a random id, so a changed
          // file is a new key. Cache hard.
          CacheControl: "public, max-age=31536000, immutable",
        }),
      );
      return { key, url: `${base}/${key}` };
    },
    async remove(key) {
      await client.send(
        new DeleteObjectCommand({ Bucket: config.bucket, Key: key }),
      );
    },
  };
}

/* -------------------------------- selection ------------------------------- */

let cached: StorageDriver | null = null;

/**
 * The active driver.
 *
 * R2 wins whenever it is configured, in every environment — that is what a
 * deploy uses. Without it, development falls back to disk so the library is
 * usable today; production refuses, because disk there is a data-loss bug
 * wearing a working upload button.
 */
export function storage(): StorageDriver {
  if (cached) return cached;

  if (hasR2Config()) {
    cached = r2Driver();
    return cached;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Media storage is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, " +
        "R2_SECRET_ACCESS_KEY, R2_BUCKET and R2_PUBLIC_URL. Local disk storage " +
        "is not available in production because the filesystem is ephemeral.",
    );
  }

  cached = localDriver();
  return cached;
}

/** Test seam — lets a test pin a driver without touching the environment. */
export function resetStorageCache(): void {
  cached = null;
}
