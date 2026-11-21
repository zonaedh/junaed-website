import type { Metadata } from "next";
import { requireRole } from "@/lib/rbac";
import { listBlocks } from "@/lib/security/blocks";
import { getSettingsForEdit } from "@/lib/settings";
import { AddBlockForm, RemoveBlockButton } from "./block-controls";

export const metadata: Metadata = { title: "Security" };

function formatWhen(value: Date | string | null): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function isExpired(value: Date | string | null): boolean {
  if (!value) return false;
  const date = typeof value === "string" ? new Date(value) : value;
  return date.getTime() <= Date.now();
}

/**
 * Security panel (MVP.md §8.2).
 *
 * Two halves: the manual block list, and the spam filter settings that decide
 * when an address earns a place on it.
 *
 * The block list is enforced in the proxy for both hosts, so a blocked address
 * gets 403 everywhere — public site and admin alike.
 */
export default async function SecurityPage() {
  await requireRole("owner");

  const [blocks, settings] = await Promise.all([listBlocks(), getSettingsForEdit()]);
  const active = blocks.filter((block) => !isExpired(block.expiresAt));

  return (
    <div className="mx-auto max-w-[1000px] space-y-5">
      <header>
        <h1 className="text-2xl font-bold tracking-[-0.02em]">Security</h1>
        <p className="mt-1 text-sm text-muted">
          {active.length} active {active.length === 1 ? "block" : "blocks"} of{" "}
          {blocks.length} total. Enforced on every request, public and admin.
        </p>
      </header>

      <AddBlockForm />

      <section>
        <h2 className="mb-2 text-sm font-bold">Blocked addresses</h2>
        {blocks.length === 0 ? (
          <p className="rounded-[14px] border border-dashed border-line px-4 py-10 text-center text-sm text-muted">
            Nothing is blocked. Add an address above, or let the spam filter do it
            automatically.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-[14px] border border-line bg-white">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-line text-[11px] uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-4 py-2.5 font-bold">Address</th>
                  <th className="px-4 py-2.5 font-bold">Reason</th>
                  <th className="px-4 py-2.5 font-bold">Added</th>
                  <th className="px-4 py-2.5 font-bold">Expires</th>
                  <th className="px-4 py-2.5 font-bold">By</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {blocks.map((block) => {
                  const expired = isExpired(block.expiresAt);
                  return (
                    <tr key={block.id} className={expired ? "opacity-55" : ""}>
                      <td className="px-4 py-2.5 font-mono text-[12px] font-semibold">
                        {block.ip}
                        {expired ? (
                          <span className="ml-2 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                            expired
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-2.5 text-[12px] text-muted">
                        {block.reason ?? "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-[12px] text-muted">
                        {formatWhen(block.createdAt)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-[12px] text-muted">
                        {block.expiresAt ? formatWhen(block.expiresAt) : "Never"}
                      </td>
                      <td className="px-4 py-2.5 text-[12px] text-muted">
                        {block.createdByName ?? "Automatic"}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <RemoveBlockButton id={block.id} ip={block.ip} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-[14px] border border-line bg-white p-4">
        <h2 className="text-sm font-bold">Spam filter</h2>
        <p className="mt-1 text-[13px] leading-[1.6] text-muted">
          These values live in Settings → Security, so they are edited in one
          place and read by the contact form.
        </p>
        <dl className="mt-3 grid gap-2 text-[13px] sm:grid-cols-2">
          <div className="flex justify-between gap-3 border-b border-line pb-2">
            <dt className="text-muted">Links allowed</dt>
            <dd className="font-semibold">{settings.values.spamMaxLinks}</dd>
          </div>
          <div className="flex justify-between gap-3 border-b border-line pb-2">
            <dt className="text-muted">Block disposable domains</dt>
            <dd className="font-semibold">
              {settings.values.blockDisposableEmail ? "Yes" : "No"}
            </dd>
          </div>
          <div className="flex justify-between gap-3 border-b border-line pb-2">
            <dt className="text-muted">Auto-block after</dt>
            <dd className="font-semibold">
              {settings.values.autoBlockAfter > 0
                ? `${settings.values.autoBlockAfter} submissions in 24h`
                : "Disabled"}
            </dd>
          </div>
          <div className="flex justify-between gap-3 border-b border-line pb-2">
            <dt className="text-muted">Admin IP allowlist</dt>
            <dd className="font-semibold">
              {settings.values.loginAllowlist.trim() === ""
                ? "Off (everyone allowed)"
                : "On"}
            </dd>
          </div>
        </dl>
        <p className="mt-3 text-[11px] text-muted">
          Change these in Settings → Security. An allowlist that omits your own
          address will lock you out of the login; you would need database access
          to undo it.
        </p>
      </section>
    </div>
  );
}
