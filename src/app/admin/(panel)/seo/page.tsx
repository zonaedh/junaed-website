import type { Metadata } from "next";
import { SectionPlaceholder } from "@/components/admin/section-placeholder";

export const metadata: Metadata = { title: "SEO" };

export default function SEOPage() {
  return (
    <SectionPlaceholder
      title="SEO"
      phase="Phase 6"
      role="editor"
      description="Global SEO defaults, per-page and per-post fields, redirects manager and a 404 log."
      bullets={[
    "Title and description counters with SERP preview",
    "JSON-LD structured data and dynamic OG images",
    "Redirect manager for 301s",
      ]}
    />
  );
}