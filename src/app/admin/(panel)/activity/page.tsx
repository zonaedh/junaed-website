import type { Metadata } from "next";
import { SectionPlaceholder } from "@/components/admin/section-placeholder";

export const metadata: Metadata = { title: "Activity" };

export default function ActivityPage() {
  return (
    <SectionPlaceholder
      title="Activity"
      phase="Phase 8"
      role="admin"
      description="Every admin action with user, IP hash, time and a before/after summary."
      bullets={[
    "Filter by user, action and date range",
    "Login, logout and failed-login events included",
    "Automatic retention of 90 days by default",
      ]}
    />
  );
}