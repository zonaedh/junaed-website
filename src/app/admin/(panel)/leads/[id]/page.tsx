import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminBase } from "@/lib/admin-path";
import { requireRole } from "@/lib/rbac";
import { getLead } from "@/lib/leads/repository";
import { hasResendConfig } from "@/lib/contact/notify";
import { LeadControls } from "../lead-controls";

export const metadata: Metadata = { title: "Lead" };

function formatWhen(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole("support");
  const base = await getAdminBase();
  const { id: rawId } = await params;
  const id = Number(rawId);

  if (!Number.isInteger(id) || id <= 0) notFound();

  const lead = await getLead(id);
  if (!lead) notFound();

  const canDelete = user.role === "admin" || user.role === "owner";

  return (
    <div className="mx-auto max-w-[1000px]">
      <div className="mb-5">
        <Link
          href={`${base}/leads`}
          className="text-sm font-semibold text-muted hover:text-violet-700"
        >
          ← All leads
        </Link>
      </div>

      <header className="mb-5">
        <h1 className="text-[clamp(1.5rem,3vw,2rem)] tracking-[-0.04em]">
          {lead.name}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {formatWhen(lead.createdAt)} · {lead.status}
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="grid gap-5">
          <section className="rounded-[16px] border border-line bg-white p-5">
            <h2 className="mb-3 text-sm font-bold">Message</h2>
            <p className="whitespace-pre-wrap text-[15px] leading-[1.7]">
              {lead.message}
            </p>
          </section>

          <section className="rounded-[16px] border border-line bg-white p-5">
            <h2 className="mb-3 text-sm font-bold">Contact</h2>
            <dl className="grid gap-2 text-sm">
              <div className="flex gap-3">
                <dt className="w-24 shrink-0 text-muted">Email</dt>
                <dd>
                  <a
                    href={`mailto:${lead.email}`}
                    className="font-semibold hover:text-violet-700"
                  >
                    {lead.email}
                  </a>
                </dd>
              </div>
              {lead.phone ? (
                <div className="flex gap-3">
                  <dt className="w-24 shrink-0 text-muted">Phone</dt>
                  <dd>{lead.phone}</dd>
                </div>
              ) : null}
              {lead.service ? (
                <div className="flex gap-3">
                  <dt className="w-24 shrink-0 text-muted">Service</dt>
                  <dd>{lead.service}</dd>
                </div>
              ) : null}
              {lead.sourcePage ? (
                <div className="flex gap-3">
                  <dt className="w-24 shrink-0 text-muted">Source</dt>
                  <dd>{lead.sourcePage}</dd>
                </div>
              ) : null}
            </dl>
          </section>

          <section className="rounded-[16px] border border-line bg-white p-5">
            <h2 className="mb-3 text-sm font-bold">Metadata</h2>
            <dl className="grid gap-2 text-sm">
              <div className="flex gap-3">
                <dt className="w-24 shrink-0 text-muted">IP hash</dt>
                <dd className="break-all font-mono text-xs">
                  {lead.ipHash ?? "—"}
                </dd>
              </div>
              <div className="flex gap-3">
                <dt className="w-24 shrink-0 text-muted">Country</dt>
                <dd>{lead.country ?? "—"}</dd>
              </div>
              <div className="flex gap-3">
                <dt className="w-24 shrink-0 text-muted">Referrer</dt>
                <dd className="break-all text-xs">{lead.referrer ?? "—"}</dd>
              </div>
              <div className="flex gap-3">
                <dt className="w-24 shrink-0 text-muted">User agent</dt>
                <dd className="break-all text-xs">{lead.userAgent ?? "—"}</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-muted">
              The IP is stored only as a salted daily hash — it cannot be reversed
              or correlated across days.
            </p>
          </section>
        </div>

        <LeadControls
          id={lead.id}
          status={lead.status}
          notes={lead.notes}
          canDelete={canDelete}
          canReply={hasResendConfig()}
        />
      </div>
    </div>
  );
}
