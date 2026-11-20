import type { Metadata } from "next";
import { SectionPlaceholder } from "@/components/admin/section-placeholder";

export const metadata: Metadata = { title: "Analytics" };

export default function AnalyticsPage() {
  return (
    <SectionPlaceholder
      title="Analytics"
      phase="Phase 7"
      role="admin"
      description="First-party visitor analytics that keep working when ad-blockers block Google Analytics, plus an optional GA4 Data API connection."
      bullets={[
    "Visitors, page views, top pages, sources, countries, devices",
    "No raw IP addresses stored — salted daily hashes only",
    "12-month retention with automatic purge",
      ]}
    />
  );
}