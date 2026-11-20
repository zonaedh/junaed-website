import type { Metadata } from "next";
import { requireRole } from "@/lib/rbac";
import { getSettingsForEdit } from "@/lib/settings";
import { listMediaForAdmin } from "@/lib/media/repository";
import { SettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Settings" };

/**
 * Site settings editor (MVP.md §3.2).
 *
 * Reads uncached on purpose: an editor must see what is actually stored, not a
 * cached copy from before the last save.
 */
export default async function SettingsPage() {
  await requireRole("admin");
  const { values, updatedAt } = await getSettingsForEdit();
  const media = await listMediaForAdmin({ type: "image" });

  return (
    <div className="mx-auto max-w-[900px]">
      <div className="mb-5">
        <h1 className="font-display text-[26px] font-extrabold tracking-[-0.04em]">
          Settings
        </h1>
        <p className="mt-1 text-sm text-muted">
          Site identity, contact details, SEO defaults and maintenance mode.
          {updatedAt ? (
            <>
              {" "}
              Last saved{" "}
              {updatedAt.toLocaleString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                timeZone: "UTC",
              })}{" "}
              UTC.
            </>
          ) : null}
        </p>
      </div>

      <SettingsForm values={values} media={media} />
    </div>
  );
}
