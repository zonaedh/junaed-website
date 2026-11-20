import { requireRole } from "@/lib/rbac";
import { logActivity, ACTIONS } from "@/lib/audit";
import { listLeadsForExport } from "@/lib/leads/repository";

/**
 * CSV export of all leads.
 *
 * A Route Handler rather than a Server Action because the browser must receive
 * a file, not a re-rendered page. The role check is repeated here: a route
 * handler is a public URL, so it cannot rely on the page that links to it
 * having been guarded.
 */

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export async function GET() {
  const user = await requireRole("admin");

  const rows = await listLeadsForExport();

  const header = [
    "id",
    "created_at",
    "name",
    "email",
    "phone",
    "service",
    "status",
    "source_page",
    "message",
    "notes",
  ];

  const lines = [header.join(",")];
  for (const row of rows) {
    lines.push(
      [
        row.id,
        row.createdAt instanceof Date
          ? row.createdAt.toISOString()
          : String(row.createdAt),
        row.name,
        row.email,
        row.phone,
        row.service,
        row.status,
        row.sourcePage,
        row.message,
        row.notes,
      ]
        .map(escapeCsv)
        .join(","),
    );
  }

  await logActivity({
    userId: user.id,
    action: ACTIONS.leadExported,
    entity: "lead",
    meta: { count: rows.length },
  });

  const stamp = new Date().toISOString().slice(0, 10);

  return new Response(`\uFEFF${lines.join("\r\n")}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="leads-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
