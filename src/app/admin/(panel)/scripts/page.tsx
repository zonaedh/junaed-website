import type { Metadata } from "next";
import { requireRole } from "@/lib/rbac";
import { listScripts } from "@/lib/analytics/scripts";
import { AddScriptForm, ScriptRowControls } from "./script-controls";

export const metadata: Metadata = { title: "Scripts" };

/**
 * Custom head and body scripts (MVP.md §7.2).
 *
 * Owner and admin only. Every change is written to the activity log, and the
 * previous version of each snippet is kept so a bad paste is one click from
 * being undone.
 */
export default async function ScriptsPage() {
  await requireRole("admin");
  const rows = await listScripts();

  return (
    <div className="mx-auto max-w-[900px] space-y-5">
      <header>
        <h1 className="text-2xl font-bold tracking-[-0.02em]">Scripts</h1>
        <p className="mt-1 text-sm text-muted">
          Snippets injected into the public site. Never loaded on the admin panel.
        </p>
      </header>

      <div className="rounded-[14px] border border-amber-200 bg-amber-50 p-4 text-[13px] leading-[1.65] text-amber-900">
        <p className="font-bold">These run on your live site.</p>
        <p className="mt-1">
          A broken snippet can blank a page for every visitor. Test in a preview
          deployment first, and keep the snippet small. The previous version is
          kept automatically, so Roll back is always available after a save.
        </p>
      </div>

      <AddScriptForm />

      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted">
          {rows.length} snippet{rows.length === 1 ? "" : "s"}
        </h2>

        {rows.length === 0 ? (
          <p className="rounded-[12px] border border-dashed border-line px-4 py-10 text-center text-sm text-muted">
            No snippets yet. Add one above.
          </p>
        ) : (
          rows.map((row) => (
            <ScriptRowControls
              key={row.id}
              id={row.id}
              name={row.name}
              location={row.location}
              code={row.code}
              pageScope={row.pageScope ?? null}
              isActive={row.isActive}
              hasPrevious={Boolean(row.previousCode)}
            />
          ))
        )}
      </section>
    </div>
  );
}