import type { Metadata } from "next";
import { SectionPlaceholder } from "@/components/admin/section-placeholder";

export const metadata: Metadata = { title: "Security" };

export default function SecurityPage() {
  return (
    <SectionPlaceholder
      title="Security"
      phase="Phase 8"
      role="owner"
      description="IP and CIDR blocking with reasons and expiry, spam filter settings, and the activity log with retention controls."
      bullets={[
    "Block list enforced in the proxy for both hosts",
    "One-click block from a lead or log entry",
    "Clearing logs requires password re-entry and is itself logged",
      ]}
    />
  );
}