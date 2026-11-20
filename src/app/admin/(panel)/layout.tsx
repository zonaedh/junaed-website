import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { AdminShell } from "@/components/admin/admin-shell";

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
  if (!session) redirect("/login");

  return (
    <AdminShell user={session.user}>{children}</AdminShell>
  );
}
