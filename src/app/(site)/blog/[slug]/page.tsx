import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ButtonLink } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { PostBody } from "@/components/site/post-body";
import { formatDate } from "@/lib/content";
import {
  getPublishedPost,
  listPublishedPosts,
} from "@/lib/posts/repository";
import { buildMetadata } from "@/lib/seo/metadata";
import { getSeoDefaults } from "@/lib/seo/repository";
import { articleSchema, breadcrumbList } from "@/lib/seo/core";
import { JsonLd } from "@/components/seo/json-ld";

type Params = { slug: string };

/**
 * Public single post (MVP.md §4.1).
 *
 * `generateStaticParams` is deliberately absent. A post published after a
 * deploy must be reachable immediately, and the cached, tagged read already
 * makes repeat views cheap. Pre-rendering would mean a new post 404s until the
 * next build — which is exactly what happened the first time this was written.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedPost(slug);
  if (!post) return { title: "Post not found", robots: { index: false, follow: false } };

  return buildMetadata({
    title: post.seoTitle || post.title,
    description: post.seoDescription || post.excerpt,
    path: post.canonicalUrl || `/blog/${post.slug}`,
    image: post.coverUrl ?? undefined,
    imageAlt: post.coverAlt || post.title,
    noindex: post.noindex,
    type: "article",
    publishedTime: post.publishedAt ?? undefined,
    modifiedTime: post.updatedAt,
    authors: post.authorName ? [post.authorName] : undefined,
    titleTemplate: "%s",
  });
}

export default async function PostPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const post = await getPublishedPost(slug);
  if (!post) notFound();

  const all = await listPublishedPosts();
  const related = all.filter((item) => item.slug !== post.slug).slice(0, 2);
  const seo = await getSeoDefaults();
  const postUrl = `${seo.siteUrl.replace(/\/+$/, "")}/blog/${post.slug}`;

  return (
    <>
      <JsonLd
        nodes={[
          articleSchema({
            type: "BlogPosting",
            headline: post.seoTitle || post.title,
            description: post.seoDescription || post.excerpt,
            url: postUrl,
            image: post.coverUrl ?? undefined,
            datePublished: post.publishedAt ?? undefined,
            dateModified: post.updatedAt,
            authorName: post.authorName ?? seo.siteName,
            authorUrl: seo.siteUrl,
            publisherName: seo.siteName,
            publisherUrl: seo.siteUrl,
            wordCount: post.wordCount || undefined,
          }),
          breadcrumbList(
            [
              { name: "Home", path: "/" },
              { name: "Blog", path: "/blog" },
              { name: post.title, path: `/blog/${post.slug}` },
            ],
            seo.siteUrl,
          ),
        ]}
      />
      <article>
        <header className="pt-10 pb-8 lg:pt-16 lg:pb-10">
          <div className="wrap max-w-[760px]">
            <Reveal>
              <nav aria-label="Breadcrumb" className="mb-6">
                <ol className="flex flex-wrap items-center gap-2 text-sm text-muted">
                  <li>
                    <Link href="/" className="hover:text-violet-700">
                      Home
                    </Link>
                  </li>
                  <li aria-hidden="true">/</li>
                  <li>
                    <Link href="/blog" className="hover:text-violet-700">
                      Blog
                    </Link>
                  </li>
                  <li aria-hidden="true">/</li>
                  <li aria-current="page" className="truncate text-ink">
                    {post.title}
                  </li>
                </ol>
              </nav>

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

              <h1 className="mt-4 mb-4 text-[clamp(2rem,4.5vw,3.25rem)] leading-[1.1] tracking-[-0.045em]">
                {post.title}
              </h1>
              <p className="text-[18px] leading-[1.7] text-muted">
                {post.excerpt}
              </p>
            </Reveal>
          </div>
        </header>

        {post.coverUrl ? (
          <div className="wrap max-w-[760px] pb-8">
            <Reveal>
              <div className="overflow-hidden rounded-[20px]">
                <Image
                  src={post.coverUrl}
                  alt={post.coverAlt}
                  width={1200}
                  height={675}
                  priority
                  sizes="(max-width: 768px) 100vw, 760px"
                  className="h-auto w-full object-cover"
                />
              </div>
            </Reveal>
          </div>
        ) : null}

        <div className="pb-16 lg:pb-20">
          <div className="wrap max-w-[760px]">
            <Reveal>
              <div className="border-t border-line pt-8">
                <PostBody doc={post.content} />
              </div>
            </Reveal>

            {post.tagNames.length > 0 ? (
              <div className="mt-8 flex flex-wrap gap-2">
                {post.tagNames.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-line px-3 py-1 text-xs font-semibold text-muted"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}

            <Reveal>
              <div className="mt-12 rounded-[24px] border border-line bg-surface p-6 sm:p-8">
                <h2 className="mb-2 text-lg tracking-[-0.03em]">
                  Working on something similar?
                </h2>
                <p className="mb-5 text-[15px] leading-[1.7] text-muted">
                  If any of this sounds like your situation, tell me about it. I
                  will tell you honestly whether I can help.
                </p>
                <ButtonLink href="/contact">Get in touch</ButtonLink>
              </div>
            </Reveal>
          </div>
        </div>
      </article>

      {related.length > 0 ? (
        <section className="border-t border-line py-14 lg:py-20">
          <div className="wrap">
            <h2 className="mb-6 text-[clamp(1.5rem,3vw,2rem)] tracking-[-0.04em]">
              Keep reading
            </h2>
            <ul className="grid gap-4 sm:grid-cols-2">
              {related.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/blog/${item.slug}`}
                    className="flex h-full flex-col rounded-[18px] border border-line p-5 transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-soft"
                  >
                    {item.categoryName ? (
                      <span className="mb-2 text-xs font-bold text-violet-700">
                        {item.categoryName}
                      </span>
                    ) : null}
                    <h3 className="mb-1.5 text-base leading-[1.35] tracking-[-0.02em]">
                      {item.title}
                    </h3>
                    <p className="text-sm leading-[1.65] text-muted">
                      {item.excerpt}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}
    </>
  );
}
