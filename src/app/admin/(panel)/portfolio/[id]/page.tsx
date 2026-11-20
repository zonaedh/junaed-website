import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminBase } from "@/lib/admin-path";
import { requireRole } from "@/lib/rbac";
import { getPortfolioForEdit } from "@/lib/portfolio/repository";
import { listMediaForAdmin } from "@/lib/media/repository";
import { PortfolioForm } from "../portfolio-form";

export const metadata: Metadata = { title: "Edit project" };

export default async function EditPortfolioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("editor");
  const base = await getAdminBase();

  const { id } = await params;
  const itemId = Number(id);
  if (!Number.isFinite(itemId)) notFound();

  const [item, media] = await Promise.all([
    getPortfolioForEdit(itemId),
    listMediaForAdmin({ type: "image" }),
  ]);

  if (!item) notFound();

  return (
    <div className="mx-auto max-w-[1180px]">
      <div className="mb-4">
        <Link
          href={`${base}/portfolio`}
          className="text-xs font-bold text-muted hover:text-violet-700"
        >
          ← All projects
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <h1 className="font-display text-[26px] font-extrabold tracking-[-0.04em]">
            Edit project
          </h1>
          <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-bold text-violet-800 capitalize">
            {item.status}
          </span>
        </div>
      </div>

      <PortfolioForm
        itemId={item.id}
        initial={item}
        media={media}
        adminBase={base}
      />
    </div>
  );
}
