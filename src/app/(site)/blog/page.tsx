import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Reveal } from "@/components/ui/reveal";
import { formatDate } from "@/lib/content";
import { listPublishedPosts } from "@/lib/posts/repository";
import { buildMetadata } from "@/lib/seo/metadata";
import { getSeoDefaults } from "@/lib/seo/repository";
import { breadcrumbList } from "@/lib/seo/core";
import { JsonLd } from "@/components/seo/json-ld";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Blog",
    description:
      "Notes on digital marketing, SEO, design and WordPress — practical observations from client work.",
    path: "/blog",
  });
}

/**
 * Public blog index (MVP.md §4.1).
 *
 * Reads from the database through a cached, tagged query. A post is listed
 * only when it is published and its publish time has passed, so a scheduled
 * post appears on its own without a cron job.
 */
export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim().toLowerCase();
  const allPosts = await listPublishedPosts();
  // The 404 page links here with ?q=, so filtering has to actually work or the
  // search box is a lie.
  const posts = query
    ? allPosts.filter(
        (post) =>
          post.title.toLowerCase().includes(query) ||
          post.excerpt.toLowerCase().includes(query),
      )
    : allPosts;
  const seo = await getSeoDefaults();

  return (
    <>
      <JsonLd
        nodes={breadcrumbList(
          [
            { name: "Home", path: "/" },
            { name: "Blog", path: "/blog" },
          ],
          seo.siteUrl,
        )}
      />
      <section className="pt-10 pb-12 lg:pt-16 lg:pb-14">
        <div className="wrap">
          <Reveal>
            <Eyebrow>Writing</Eyebrow>
            <h1 className="mt-5 mb-5 max-w-[820px] text-[clamp(2.5rem,5.5vw,4rem)] leading-[1.06] tracking-[-0.05em]">
              Notes from <span className="text-violet-600">client work.</span>
            </h1>
            <p className="max-w-[640px] text-[17px] leading-[1.75] text-muted">
              Short, practical observations about marketing, search and building
              websites that hold up. No listicles.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="pb-16 lg:pb-[85px]">
        <div className="wrap">
          {posts.length === 0 ? (
            <p className="rounded-[18px] border border-dashed border-line px-5 py-14 text-center text-sm text-muted">
              {query
                ? `No posts match “${q}”. Try a different word.`
                : "Nothing published yet. The first post will appear here."}
            </p>
          ) : (
            <ul className="divide-y divide-line border-y border-line">
              {posts.map((post, index) => (
                <Reveal as="li" key={post.id} delay={index * 50}>
                  <article className="group relative py-7">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
                      {post.categoryName ? (
                        <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-bold text-violet-800">
                          {post.categoryName}
                        </span>
                      ) : null}
                      {post.publishedAt ? (
                        <time dateTime={post.publishedAt}>
                          {formatDate(post.publishedAt.slice(0, 10))}
                        </time>
                      ) : null}
                      {post.readingMinutes > 0 ? (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>{post.readingMinutes} min read</span>
                        </>
                      ) : null}
                    </div>

                    <div className="mt-3 flex gap-4">
                      {post.coverUrl ? (
                        <div className="hidden shrink-0 overflow-hidden rounded-[12px] sm:block">
                          <Image
                            src={post.coverUrl}
                            alt={post.coverAlt}
                            width={200}
                            height={140}
                            className="h-[110px] w-[160px] object-cover"
                          />
                        </div>
                      ) : null}

                      <div className="min-w-0">
                        <h2 className="mb-2 text-[clamp(1.375rem,2.5vw,1.75rem)] leading-[1.25] tracking-[-0.035em]">
                          <Link
                            href={`/blog/${post.slug}`}
                            className="after:absolute after:inset-0 after:content-[''] group-hover:text-violet-700"
                          >
                            {post.title}
                          </Link>
                        </h2>
                        <p className="max-w-[680px] text-[16px] leading-[1.7] text-muted">
                          {post.excerpt}
                        </p>
                      </div>
                    </div>
                  </article>
                </Reveal>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
