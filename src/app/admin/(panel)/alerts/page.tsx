import type { Metadata } from "next";
import { requireRole } from "@/lib/rbac";
import { countUnreadAlerts, listAlerts } from "@/lib/analytics/repository";
import { MarkAllReadButton, MarkReadButton } from "./alert-controls";

export const metadata: Metadata = { title: "Alerts" };

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

const SEVERITY_STYLE: Record<string, string> = {
  critical: "bg-red-50 text-red-700",
  warning: "bg-amber-50 text-amber-700",
  info: "bg-violet-50 text-violet-700",
};

/**
 * Alerts page (MVP.md §7.4).
 *
 * Alerts are raised by the app itself — a new lead, a spike, a failed backup —
 * and each type is raised at most once a day so the list stays worth reading.
 */
export default async function AlertsPage() {
  await requireRole("support");

  const [alerts, unread] = await Promise.all([listAlerts(50), countUnreadAlerts()]);

  return (
    <div className="mx-auto max-w-[900px] space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-[-0.02em]">Alerts</h1>
          <p className="mt-1 text-sm text-muted">
            {unread} unread of {alerts.length} shown.
          </p>
        </div>
        <MarkAllReadButton disabled={unread === 0} />
      </header>

      {alerts.length === 0 ? (
        <p className="rounded-[14px] border border-dashed border-line px-4 py-12 text-center text-sm text-muted">
          Nothing to report. Alerts appear here when something needs attention.
        </p>
      ) : (
        <ul className="divide-y divide-line rounded-[14px] border border-line bg-white">
          {alerts.map((alert) => (
            <li key={alert.id} className="flex flex-wrap items-start gap-3 p-4">
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-bold uppercase ${
                  SEVERITY_STYLE[alert.severity] ?? SEVERITY_STYLE.info
                }`}
              >
                {alert.severity}
              </span>
              <div className="min-w-0 flex-1">
                <p className={`text-sm ${alert.isRead ? "text-muted" : "font-semibold"}`}>
                  {alert.message}
                </p>
                <p className="mt-0.5 text-[11px] text-muted">
                  {alert.type} · {formatWhen(alert.createdAt)}
                </p>
              </div>
              {alert.isRead ? (
                <span className="text-[11px] text-muted">Read</span>
              ) : (
                <MarkReadButton id={alert.id} />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}