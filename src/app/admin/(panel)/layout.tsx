import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { getAdminBase } from "@/lib/admin-path";
import { AdminShell } from "@/components/admin/admin-shell";
import { countUnreadLeads } from "@/lib/leads/repository";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * Authenticated admin area.
 *
 * This is a second gate on top of the proxy: even if a route were reached
 * directly, no session means no render. Every child page must still call
 * requireRole() for its own permission level.
 */
export default async function AdminAreaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect(`${await getAdminBase()}/login`);

  // The unread badge is fetched here because the shell is a client component
  // and must not touch the database. A count failure must not break the panel.
  const unreadLeads = await countUnreadLeads().catch(() => 0);

  return (
    <AdminShell user={session.user} unreadLeads={unreadLeads}>
      {children}
    </AdminShell>
  );
}
