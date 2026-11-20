import type { Metadata } from "next";
import { getAdminBase } from "@/lib/admin-path";
import { requireRole } from "@/lib/rbac";
import { listMediaForAdmin } from "@/lib/media/repository";
import { findMediaUsage } from "@/lib/media/usage";
import { hasR2Config } from "@/lib/media/storage";
import type { MediaUsage } from "@/lib/media/types";
import { MediaGrid } from "./media-grid";
import { MediaUploader } from "./media-uploader";

export const metadata: Metadata = { title: "Media" };

/**
 * Media library (MVP.md §3.1).
 *
 * Reads uncached: an editor who has just uploaded must see the file, not a
 * cached list from before. Usage is resolved per item here rather than in the
 * grid so the client component never touches the database.
 */
export default async function MediaPage() {
  await requireRole("editor");
  const adminBase = await getAdminBase();

  const items = await listMediaForAdmin({ limit: 300 });

  const usageEntries = await Promise.all(
    items.map(async (item) => [item.id, await findMediaUsage(item.id)] as const),
  );
  const usageById: Record<number, MediaUsage[]> = Object.fromEntries(usageEntries);

  const usingR2 = hasR2Config();

  return (
    <div className="mx-auto max-w-[1180px]">
      <header className="mb-6">
        <h1 className="text-[clamp(1.5rem,3vw,2rem)] tracking-[-0.04em]">Media</h1>
        <p className="mt-1 max-w-[640px] text-sm leading-[1.7] text-muted">
          Upload images once and reuse them anywhere. Images are converted to
          WebP, resized to a sensible maximum and stripped of EXIF metadata
          before they are stored.
        </p>
      </header>

      {!usingR2 ? (
        <div className="mb-5 rounded-[14px] border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-bold">Storing to local disk (development only).</p>
          <p className="mt-1 text-[13px] leading-[1.6]">
            Uploads are written to <code>public/uploads</code> and will not
            survive a deploy. Add the Cloudflare R2 variables from{" "}
            <code>.env.example</code> to switch storage; nothing else changes.
          </p>
        </div>
      ) : null}

      <div className="mb-6">
        <MediaUploader />
      </div>

      <MediaGrid items={items} usageById={usageById} adminBase={adminBase} />
    </div>
  );
}
