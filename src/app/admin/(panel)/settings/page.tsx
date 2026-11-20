import type { Metadata } from "next";
import { SectionPlaceholder } from "@/components/admin/section-placeholder";

export const metadata: Metadata = { title: "Settings" };

export default function SettingsPage() {
  return (
    <SectionPlaceholder
      title="Settings"
      phase="Phase 3"
      role="admin"
      description="Site name, tagline, contact details, social links, branding, footer text and maintenance mode."
      bullets={[
    "Changes reflect on the public site within seconds",
    "Settings cached and revalidated by tag",
    "Analytics and tracking IDs configured here in Phase 7",
      ]}
    />
  );
}