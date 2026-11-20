import type { Metadata } from "next";
import { SectionPlaceholder } from "@/components/admin/section-placeholder";

export const metadata: Metadata = { title: "Staff" };

export default function StaffPage() {
  return (
    <SectionPlaceholder
      title="Staff"
      phase="Phase 8"
      role="owner"
      description="Invite staff by email, assign roles, deactivate accounts, force a password reset and revoke sessions."
      bullets={[
    "Owner, Admin, Editor and Support roles enforced server-side",
    "2FA status visible per account",
    "The owner account cannot be demoted or deleted by others",
      ]}
    />
  );
}