import type { Metadata } from "next";
import Link from "next/link";
import { getAdminBase } from "@/lib/admin-path";
import { requireRole } from "@/lib/rbac";
import { listPostsForAdmin } from "@/lib/posts/repository";
import { formatDate } from "@/lib/content";

export const metadata: Metadata = { title: "Posts" };

const STATUS_STYLE: Record<string, string> = {
  published: "bg-emerald-50 text-emerald-800",
  draft: "bg-amber-50 text-amber-900",
  scheduled: "bg-violet-50 text-violet-800",
  archived: "bg-surface text-muted",
};

/**
 * Posts list (MVP.md §4.1).
 *
 * Reads uncached: an editor who just published must see the new status.
 */
export default async function PostsPage() {
  await requireRole("editor");
  const base = await getAdminBase();
  const posts = await listPostsForAdmin();

  const counts = posts.reduce<Record<string, number>>((accumulator, post) => {
    accumulator[post.status] = (accumulator[post.status] ?? 0) + 1;
    return accumulator;
  }, {});

  return (
    <div className="mx-auto max-w-[1000px]">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[clamp(1.5rem,3vw,2rem)] tracking-[-0.04em]">
            Posts
          </h1>
          <p className="mt-1 text-sm text-muted">
            {counts.published ?? 0} published · {counts.draft ?? 0} draft ·{" "}
            {counts.scheduled ?? 0} scheduled
          </p>
        </div>
        <Link
          href={`${base}/posts/new`}
          className="inline-flex min-h-10 items-center rounded-[10px] bg-violet-950 px-4 text-sm font-bold text-white hover:bg-violet-700"
        >
          New post
        </Link>
      </header>

      {posts.length === 0 ? (
        <div className="rounded-[16px] border border-dashed border-line px-5 py-14 text-center">
          <p className="text-sm font-bold">No posts yet.</p>
          <p className="mx-auto mt-1 max-w-[420px] text-sm leading-[1.6] text-muted">
            Write the first one. Posts appear on the public blog once they are
            published, and a scheduled post goes live on its own.
          </p>
          <Link
            href={`${base}/posts/new`}
            className="mt-4 inline-flex min-h-10 items-center rounded-[10px] bg-violet-950 px-4 text-sm font-bold text-white"
          >
            Write a post
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-[16px] border border-line bg-white">
          {posts.map((post) => (
            <li key={post.id}>
              <Link
                href={`${base}/posts/${post.id}`}
                className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3.5 transition-colors hover:bg-violet-50/40"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">
                    {post.title}
                  </span>
                  <span className="block truncate text-xs text-muted">
                    /blog/{post.slug}
                    {post.categoryName ? ` · ${post.categoryName}` : ""}
                  </span>
                </span>

                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold capitalize ${
                    STATUS_STYLE[post.status] ?? "bg-surface text-muted"
                  }`}
                >
                  {post.status}
                </span>

                <span className="w-[130px] text-right text-xs text-muted">
                  {post.publishedAt
                    ? formatDate(post.publishedAt.toISOString().slice(0, 10))
                    : "—"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
