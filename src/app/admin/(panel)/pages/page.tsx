import type { Metadata } from "next";
import { SectionPlaceholder } from "@/components/admin/section-placeholder";

export const metadata: Metadata = { title: "Pages" };

export default function PagesPage() {
  return (
    <SectionPlaceholder
      title="Pages"
      phase="Phase 3"
      role="editor"
      description="Editable page content: hero text, about story, contact copy and legal pages, each built from typed sections so the design cannot break."
      bullets={[
    "Home, About, Contact, Privacy and Terms editors",
    "Media picker for the hero and about images",
    "Draft / published status with a signed preview link",
      ]}
    />
  );
}