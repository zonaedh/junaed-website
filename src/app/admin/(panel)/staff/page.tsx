import type { Metadata } from "next";
import { requireRole } from "@/lib/rbac";
import { listStaff } from "@/lib/staff/repository";
import { assignableRoles, canManageStaff } from "@/lib/staff/rules";
import { AddStaffForm, StaffRowControls } from "./staff-controls";

export const metadata: Metadata = { title: "Staff" };

function formatWhen(value: Date | string | null): string {
  if (!value) return "Never";
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Staff accounts (MVP.md §8.4).
 *
 * The page decides what to *show*; the actions decide what is *allowed*. Both
 * call the same rules module, so they cannot drift apart.
 *
 * `canManage` is computed per row with the same function the action uses, which
 * is why a row the actor cannot touch renders read-only rather than offering a
 * button that would fail.
 */
export default async function StaffPage() {
  const actor = await requireRole("admin");

  const staff = await listStaff();
  const roles = assignableRoles(actor);

  return (
    <div className="mx-auto max-w-[900px] space-y-5">
      <header>
        <h1 className="text-2xl font-bold tracking-[-0.02em]">Staff</h1>
        <p className="mt-1 text-sm text-muted">
          {staff.length} {staff.length === 1 ? "account" : "accounts"} ·{" "}
          {staff.filter((row) => row.isActive).length} active. The owner account
          cannot be changed by anyone else.
        </p>
      </header>

      <AddStaffForm roles={roles} />

      <section className="space-y-2">
        <h2 className="text-sm font-bold">Accounts</h2>
        {staff.map((row) => {
          const target = { id: row.id, role: row.role, isActive: row.isActive };
          const manage = canManageStaff(actor, target, "change_role").allowed;
          const resetTotp = actor.role === "owner" && (row.role !== "owner" || actor.id === row.id);

          return (
            <div key={row.id}>
              <StaffRowControls
                id={row.id}
                name={row.name}
                role={row.role}
                isActive={row.isActive}
                totpEnabled={row.totpEnabled}
                sessionCount={row.sessionCount}
                roles={roles}
                canManage={manage}
                canResetTotp={resetTotp}
              />
              <p className="mt-1 px-1 text-[11px] text-muted">
                {row.email} · added {formatWhen(row.createdAt)} · last sign-in{" "}
                {formatWhen(row.lastLoginAt)}
              </p>
            </div>
          );
        })}
      </section>
    </div>
  );
}
