import type { Metadata } from "next";
import { SectionPlaceholder } from "@/components/admin/section-placeholder";

export const metadata: Metadata = { title: "Media" };

export default function MediaPage() {
  return (
    <SectionPlaceholder
      title="Media"
      phase="Phase 3"
      role="editor"
      description="WordPress-style media library backed by Cloudflare R2: drag and drop upload, sharp conversion to WebP, thumbnails, alt text and usage tracking."
      bullets={[
    "MIME validated by content, EXIF stripped, SVG sanitised",
    "Media picker modal reused by every image field",
    "Deletion blocked while an image is in use",
      ]}
    />
  );
}