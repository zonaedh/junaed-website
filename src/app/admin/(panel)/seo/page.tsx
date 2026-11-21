import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/rbac";
import { getSeoDefaults, listNotFound, listRedirects } from "@/lib/seo/repository";
import { titleLengthState, descriptionLengthState } from "@/lib/seo/core";
import {
  AddRedirectForm,
  ClearNotFoundButton,
  NotFoundRowControls,
  RedirectRowControls,
} from "./seo-controls";

export const metadata: Metadata = { title: "SEO" };

function formatWhen(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const STATE_STYLE: Record<string, string> = {
  good: "text-emerald-700",
  long: "text-amber-700",
  short: "text-amber-700",
  thin: "text-amber-700",
  empty: "text-red-700",
};

/**
 * SEO tab (MVP.md §6.2).
 *
 * Three things live here: the global defaults summary (which links to the
 * settings form rather than duplicating it), the redirects manager, and the 404
 * log with a one-click path from a broken URL to a redirect.
 */
export default async function SEOPage() {
  const user = await requireRole("editor");
  const canClear = user.role === "owner" || user.role === "admin";

  const [defaults, redirects, notFound] = await Promise.all([
    getSeoDefaults(),
    listRedirects(),
    listNotFound(50),
  ]);

  const titleState = titleLengthState(defaults.titleTemplate);
  const descState = descriptionLengthState(defaults.defaultDescription);
  const activeCount = redirects.filter((row) => row.isActive).length;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-[-0.02em]">SEO</h1>
        <p className="mt-1 text-sm text-muted">
          Global defaults, redirects and the 404 log. Per-post and per-project
          fields live in their own editors.
        </p>
      </header>

      {/* -------------------------- Global defaults -------------------------- */}
      <section className="rounded-[14px] border border-line bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted">
            Global defaults
          </h2>
          <Link
            href="/settings"
            className="text-sm font-semibold text-violet-700 hover:underline"
          >
            Edit in Settings →
          </Link>
        </div>

        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-bold text-muted">Title template</dt>
            <dd className="mt-1 text-sm">{defaults.titleTemplate}</dd>
            <dd className={`mt-1 text-xs ${STATE_STYLE[titleState]}`}>
              {defaults.titleTemplate.length} characters
              {titleState === "long" ? " — will be truncated in results" : ""}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-bold text-muted">Default description</dt>
            <dd className="mt-1 line-clamp-2 text-sm">
              {defaults.defaultDescription}
            </dd>
            <dd className={`mt-1 text-xs ${STATE_STYLE[descState]}`}>
              {defaults.defaultDescription.length} characters
              {descState === "long" ? " — will be truncated" : ""}
              {descState === "thin" ? " — a little short" : ""}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-bold text-muted">Site URL</dt>
            <dd className="mt-1 text-sm">{defaults.siteUrl}</dd>
          </div>
          <div>
            <dt className="text-xs font-bold text-muted">Verification</dt>
            <dd className="mt-1 text-sm">
              Google: {defaults.googleVerification ? "set" : "not set"} · Bing:{" "}
              {defaults.bingVerification ? "set" : "not set"}
            </dd>
          </div>
        </dl>

        <div className="mt-4 flex flex-wrap gap-3 border-t border-line pt-4 text-sm">
          <Link href="/sitemap.xml" className="font-semibold text-violet-700 hover:underline">
            sitemap.xml
          </Link>
          <Link href="/robots.txt" className="font-semibold text-violet-700 hover:underline">
            robots.txt
          </Link>
          <Link href="/rss.xml" className="font-semibold text-violet-700 hover:underline">
            rss.xml
          </Link>
        </div>
      </section>

      {/* ---------------------------- Redirects ------------------------------ */}
      <section className="rounded-[14px] border border-line bg-white p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted">
            Redirects
          </h2>
          <p className="text-xs text-muted">
            {redirects.length} total · {activeCount} active
          </p>
        </div>

        <div className="mt-4">
          <AddRedirectForm />
        </div>

        {redirects.length === 0 ? (
          <p className="mt-4 rounded-[12px] border border-dashed border-line px-4 py-8 text-center text-sm text-muted">
            No redirects yet. Add one above, or create one from the 404 log below.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="py-2 pr-3 font-bold">From</th>
                  <th className="py-2 pr-3 font-bold">To</th>
                  <th className="py-2 pr-3 font-bold">Code</th>
                  <th className="py-2 pr-3 font-bold">Status</th>
                  <th className="py-2 font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {redirects.map((row) => (
                  <tr key={row.id}>
                    <td className="py-2.5 pr-3 font-mono text-xs">{row.fromPath}</td>
                    <td className="py-2.5 pr-3 font-mono text-xs">{row.toPath}</td>
                    <td className="py-2.5 pr-3">{row.code}</td>
                    <td className="py-2.5 pr-3">
                      <span
                        className={
                          row.isActive
                            ? "rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700"
                            : "rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600"
                        }
                      >
                        {row.isActive ? "Active" : "Off"}
                      </span>
                    </td>
                    <td className="py-2.5">
                      <RedirectRowControls id={row.id} isActive={row.isActive} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ------------------------------ 404 log ------------------------------ */}
      <section className="rounded-[14px] border border-line bg-white p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted">
            404 log
          </h2>
          <div className="flex items-center gap-3">
            <p className="text-xs text-muted">
              {notFound.length} distinct broken URL{notFound.length === 1 ? "" : "s"}
            </p>
            {canClear && notFound.length > 0 ? <ClearNotFoundButton /> : null}
          </div>
        </div>

        {notFound.length === 0 ? (
          <p className="mt-4 rounded-[12px] border border-dashed border-line px-4 py-8 text-center text-sm text-muted">
            Nothing broken. A 404 on the public site lands here automatically.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-line">
            {notFound.map((row) => (
              <li key={row.id} className="py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-mono text-xs break-all">{row.path}</span>
                  <span className="text-xs text-muted">
                    {row.hits} hit{row.hits === 1 ? "" : "s"} · last{" "}
                    {formatWhen(row.lastSeenAt)}
                  </span>
                </div>
                <div className="mt-2">
                  <NotFoundRowControls id={row.id} path={row.path} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
