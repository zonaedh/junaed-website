import type { Metadata } from "next";
import { SectionPlaceholder } from "@/components/admin/section-placeholder";

export const metadata: Metadata = { title: "Portfolio" };

export default function PortfolioPage() {
  return (
    <SectionPlaceholder
      title="Portfolio"
      phase="Phase 4"
      role="editor"
      description="Case studies with cover image, gallery, client, year, results and a rich-text body. Drag to reorder, flag items as featured."
      bullets={[
    "Add, edit, reorder and soft-delete to Trash for 30 days",
    "Featured flag drives the home page Selected work section",
    "Public case-study page at /portfolio/[slug]",
      ]}
    />
  );
}