import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminBase } from "@/lib/admin-path";
import { requireRole } from "@/lib/rbac";
import {
  getPostForEdit,
  listCategories,
} from "@/lib/posts/repository";
import { listMediaForAdmin } from "@/lib/media/repository";
import { analyseDoc, docToPlainText } from "@/lib/posts/content";
import { getSeoDefaults } from "@/lib/seo/repository";
import { PostForm } from "../post-form";

export const metadata: Metadata = { title: "Edit post" };

/**
 * Edit one post. `params` is a Promise in Next 16 — awaiting it is required.
 */
export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("editor");
  const base = await getAdminBase();

  const { id } = await params;
  const postId = Number(id);
  if (!Number.isFinite(postId)) notFound();

  const [post, categories, media, seo] = await Promise.all([
    getPostForEdit(postId),
    listCategories(),
    listMediaForAdmin({ type: "image" }),
    getSeoDefaults(),
  ]);

  if (!post) notFound();
  const seoHost = seo.siteUrl.replace(/^https?:\/\//, "").replace(/\/+$/, "");

  return (
    <div className="mx-auto max-w-[1180px]">
      <div className="mb-4">
        <Link
          href={`${base}/posts`}
          className="text-xs font-bold text-muted hover:text-violet-700"
        >
          ← All posts
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <h1 className="font-display text-[26px] font-extrabold tracking-[-0.04em]">
            Edit post
          </h1>
          <span className="rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-bold text-violet-800 capitalize">
            {post.status}
          </span>
        </div>
      </div>

      <PostForm
        postId={post.id}
        initial={post}
        categories={categories}
        media={media}
        adminBase={base}
        bodyText={docToPlainText(post.content)}
        imageAlts={analyseDoc(post.content).imageAlts}
        internalLinks={analyseDoc(post.content).internalLinks}
        siteHost={seoHost}
      />
    </div>
  );
}
