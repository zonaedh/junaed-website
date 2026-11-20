import type { Metadata } from "next";
import { SectionPlaceholder } from "@/components/admin/section-placeholder";

export const metadata: Metadata = { title: "Backups" };

export default function BackupsPage() {
  return (
    <SectionPlaceholder
      title="Backups"
      phase="Phase 9"
      role="owner"
      description="Weekly encrypted database backups to Namecheap cPanel via GitHub Actions, keeping the last three and hard-deleting older ones."
      bullets={[
    "Run backup now via GitHub workflow_dispatch",
    "Status, size and timestamp of the last three backups",
    "Restore guide and an alert if no backup succeeds in 8 days",
      ]}
    />
  );
}