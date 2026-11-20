import Link from "next/link";
import { requireRole } from "@/lib/rbac";

/**
 * Placeholder for an admin section scheduled for a later phase.
 *
 * These exist so the sidebar never links to a 404 while the panel is being
 * built. Each one states the phase it lands in and what it will do — no fake
 * data, no dead buttons.
 */

export type PlaceholderRole = "support" | "editor" | "admin" | "owner";

export async function SectionPlaceholder({
  title,
  phase,
  description,
  bullets,
  role = "editor",
}: {
  title: string;
  phase: string;
  description: string;
  bullets: string[];
  role?: PlaceholderRole;
}) {
  await requireRole(role);

  return (
    <div className="mx-auto max-w-[820px]">
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <h1 className="font-display text-[26px] font-extrabold tracking-[-0.04em]">
          {title}
        </h1>
        <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-bold text-violet-800">
          {phase}
        </span>
      </div>

      <div className="rounded-[18px] border border-line bg-white p-6">
        <p className="text-sm leading-[1.7] text-[#3c3948]">{description}</p>

        <ul className="mt-4 space-y-2">
          {bullets.map((bullet) => (
            <li
              key={bullet}
              className="flex items-start gap-2.5 text-sm leading-[1.6] text-muted"
            >
              <span aria-hidden="true" className="mt-1 text-violet-500">
                ·
              </span>
              {bullet}
            </li>
          ))}
        </ul>

        <Link
          href="/dashboard"
          className="mt-6 inline-flex min-h-10 items-center rounded-lg border border-line px-4 text-sm font-bold text-violet-800 transition hover:bg-violet-50"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
