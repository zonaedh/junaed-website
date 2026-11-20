import type { Metadata } from "next";
import { SectionPlaceholder } from "@/components/admin/section-placeholder";

export const metadata: Metadata = { title: "Leads" };

export default function LeadsPage() {
  return (
    <SectionPlaceholder
      title="Leads"
      phase="Phase 5"
      role="support"
      description="Every contact form submission, with status, internal notes, reply-by-email and CSV export."
      bullets={[
    "New / Read / Replied / Archived / Spam workflow",
    "Spam scoring, disposable-domain checks and IP blocking",
    "Telegram notification on each new lead",
      ]}
    />
  );
}