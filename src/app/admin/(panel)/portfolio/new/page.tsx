import type { Metadata } from "next";
import Link from "next/link";
import { getAdminBase } from "@/lib/admin-path";
import { requireRole } from "@/lib/rbac";
import { listMediaForAdmin } from "@/lib/media/repository";
import { EMPTY_DOC } from "@/lib/posts/content";
import { PortfolioForm } from "../portfolio-form";

export const metadata: Metadata = { title: "New project" };

export default async function NewPortfolioPage() {
  await requireRole("editor");
  const base = await getAdminBase();
  const media = await listMediaForAdmin({ type: "image" });

  return (
    <div className="mx-auto max-w-[1180px]">
      <div className="mb-4">
        <Link
          href={`${base}/portfolio`}
          className="text-xs font-bold text-muted hover:text-violet-700"
        >
          ← All projects
        </Link>
        <h1 className="mt-2 font-display text-[26px] font-extrabold tracking-[-0.04em]">
          New project
        </h1>
      </div>

      <PortfolioForm
        itemId={null}
        initial={{
          title: "",
          slug: "",
          summary: "",
          content: EMPTY_DOC,
          status: "draft",
          client: "",
          year: "",
          externalUrl: "",
          tagsText: "",
          results: [],
          coverMediaId: null,
          gallery: [],
          isFeatured: false,
          sortOrder: 0,
          seoTitle: "",
          seoDescription: "",
          noindex: false,
        }}
        media={media}
        adminBase={base}
      />
    </div>
  );
}
