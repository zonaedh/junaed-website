import type { Metadata } from "next";
import Link from "next/link";
import { getAdminBase } from "@/lib/admin-path";
import { requireRole } from "@/lib/rbac";
import { listCategories } from "@/lib/posts/repository";
import { listMediaForAdmin } from "@/lib/media/repository";
import { EMPTY_DOC } from "@/lib/posts/content";
import { PostForm } from "../post-form";

export const metadata: Metadata = { title: "New post" };

export default async function NewPostPage() {
  await requireRole("editor");
  const base = await getAdminBase();

  const [categories, media] = await Promise.all([
    listCategories(),
    listMediaForAdmin({ type: "image" }),
  ]);

  return (
    <div className="mx-auto max-w-[1180px]">
      <div className="mb-4">
        <Link
          href={`${base}/posts`}
          className="text-xs font-bold text-muted hover:text-violet-700"
        >
          ← All posts
        </Link>
        <h1 className="mt-2 font-display text-[26px] font-extrabold tracking-[-0.04em]">
          New post
        </h1>
      </div>

      <PostForm
        postId={null}
        initial={{
          title: "",
          slug: "",
          excerpt: "",
          content: EMPTY_DOC,
          status: "draft",
          publishedAt: "",
          categoryId: null,
          tagNames: [],
          coverMediaId: null,
          seoTitle: "",
          seoDescription: "",
          canonicalUrl: "",
          noindex: false,
        }}
        categories={categories}
        media={media}
        adminBase={base}
      />
    </div>
  );
}
