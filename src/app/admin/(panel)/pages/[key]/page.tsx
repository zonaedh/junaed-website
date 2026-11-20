import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/rbac";
import { getAdminBase } from "@/lib/admin-path";
import { getPageForEdit, pageDefinition } from "@/lib/pages";
import { listMediaForAdmin } from "@/lib/media/repository";
import { PageForm } from "./page-form";

export const metadata: Metadata = { title: "Edit page" };

/**
 * Per-page editor (MVP.md §3.3).
 *
 * `params` is a Promise in Next 16 — the docs are explicit about this and the
 * old synchronous shape fails the build.
 */
export default async function EditPagePage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  await requireRole("editor");
  const base = await getAdminBase();

  const { key } = await params;
  const definition = pageDefinition(key);
  if (!definition) notFound();

  const { content, status, exists, updatedAt } = await getPageForEdit(key);

  // Only needed when this page declares an image field; the picker is the one
  // control that needs the library in hand.
  const hasImageField = definition.fields.some((field) => field.kind === "image");
  const media = hasImageField ? await listMediaForAdmin({ type: "image" }) : [];

  return (
    <div className="mx-auto max-w-[820px]">
      <div className="mb-5">
        <Link
          href={`${base}/pages`}
          className="text-xs font-bold text-muted transition hover:text-violet-700"
        >
          ← All pages
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <h1 className="font-display text-[26px] font-extrabold tracking-[-0.04em]">
            {definition.name}
          </h1>
          <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-bold text-violet-800">
            {definition.path}
          </span>
        </div>
        <p className="mt-1 text-sm text-muted">
          {definition.description}
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

      <PageForm
        definition={definition}
        content={content}
        status={status}
        exists={exists}
        media={media}
      />
    </div>
  );
}
