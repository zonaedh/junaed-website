import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/rbac";
import { ROLE_LABELS } from "@/lib/rbac";

export const metadata: Metadata = { title: "Dashboard" };

/**
 * Dashboard shell for Phase 2.
 *
 * Real KPIs (visitors, leads, conversions) arrive in Phase 7 once the tracker
 * and leads tables have data. What is here is honest: account state, security
 * posture, and what is still to be built — not invented numbers.
 */
export default async function DashboardPage() {
  const user = await requireRole("support");

  const checklist = [
    {
      label: "Two-factor authentication",
      done: user.totpEnabled,
      href: "/account/2fa",
      hint: user.totpEnabled
        ? "Enabled on this account."
        : "Required for owner and admin roles.",
    },
    {
      label: "Content management",
      done: false,
      href: "/pages",
      hint: "Pages, posts, portfolio and media arrive in Phases 3–4.",
    },
    {
      label: "Leads inbox",
      done: false,
      href: "/leads",
      hint: "Contact form delivery arrives in Phase 5.",
    },
    {
      label: "Analytics",
      done: false,
      href: "/analytics",
      hint: "First-party tracking arrives in Phase 7.",
    },
  ];

  const doneCount = checklist.filter((item) => item.done).length;

  return (
    <div className="mx-auto max-w-[1100px]">
      <div className="mb-6">
        <h1 className="font-display text-[26px] font-extrabold tracking-[-0.04em]">
          Welcome back, {user.name.split(" ")[0]}
        </h1>
        <p className="mt-1 text-sm text-muted">
          Signed in as {ROLE_LABELS[user.role]}. This is the Phase 2 admin shell.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Your role" value={ROLE_LABELS[user.role]} />
        <StatCard
          label="2FA"
          value={user.totpEnabled ? "Enabled" : "Not set up"}
          tone={user.totpEnabled ? "good" : "warn"}
        />
        <StatCard label="Setup steps done" value={`${doneCount} / ${checklist.length}`} />
        <StatCard label="Phase" value="2 of 10" />
      </div>

      <section className="mt-6 rounded-[18px] border border-line bg-white p-5 sm:p-6">
        <h2 className="mb-1 font-display text-lg font-extrabold tracking-[-0.03em]">
          Setup checklist
        </h2>
        <p className="mb-4 text-sm text-muted">
          What is live now, and what is still being built.
        </p>

        <ul className="divide-y divide-line">
          {checklist.map((item) => (
            <li key={item.label} className="flex items-start gap-3 py-3">
              <span
                aria-hidden="true"
                className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-[11px] font-bold ${
                  item.done
                    ? "bg-[#e8f8f0] text-[#1f9d63]"
                    : "bg-violet-50 text-violet-700"
                }`}
              >
                {item.done ? "✓" : "·"}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">{item.label}</p>
                <p className="text-xs leading-[1.6] text-muted">{item.hint}</p>
              </div>
              <Link
                href={item.href}
                className="shrink-0 text-xs font-bold text-violet-700 hover:text-violet-900"
              >
                Open
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-6 text-xs leading-[1.7] text-muted">
        No visitor, lead or traffic figures are shown here yet on purpose. They
        appear once the tracker and leads tables have real data in Phases 5–7.
      </p>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "good" | "warn";
}) {
  const toneClass =
    tone === "good"
      ? "text-[#1f9d63]"
      : tone === "warn"
        ? "text-amber-700"
        : "text-ink";

  return (
    <div className="rounded-[16px] border border-line bg-white p-4">
      <p className="text-[11px] font-bold tracking-[0.1em] text-muted uppercase">
        {label}
      </p>
      <p className={`mt-1.5 font-display text-xl font-extrabold tracking-[-0.03em] ${toneClass}`}>
        {value}
      </p>
    </div>
  );
}
