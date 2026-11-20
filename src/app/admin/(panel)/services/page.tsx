import type { Metadata } from "next";
import { SectionPlaceholder } from "@/components/admin/section-placeholder";

export const metadata: Metadata = { title: "Services" };

export default function ServicesPage() {
  return (
    <SectionPlaceholder
      title="Services"
      phase="Phase 4"
      role="editor"
      description="The four services, editable without touching code: title, icon, summary, full body, deliverables and order."
      bullets={[
    "Add a new service and it appears on /services automatically",
    "Per-service SEO fields",
    "Reorder to control the home page grid",
      ]}
    />
  );
}