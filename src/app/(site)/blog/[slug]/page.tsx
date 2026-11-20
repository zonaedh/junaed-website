import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ButtonLink } from "@/components/ui/button";
import { Reveal } from "@/components/ui/reveal";
import { formatDate, getPost, posts } from "@/lib/content";
import { site } from "@/lib/site";

type Params = { slug: string };

export function generateStaticParams(): Params[] {
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return { title: "Post not found" };

  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      url: `/blog/${post.slug}`,
      type: "article",
      publishedTime: post.publishedAt,
      authors: [site.name],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.excerpt,
    },
  };
}

export default async function PostPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const related = posts.filter((item) => item.slug !== post.slug).slice(0, 2);

  return (
    <>
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
                <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-bold text-violet-800">
                  {post.category}
                </span>
                <time dateTime={post.publishedAt}>
                  {formatDate(post.publishedAt)}
                </time>
                <span aria-hidden="true">·</span>
                <span>{post.readingMinutes} min read</span>
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

        <div className="pb-16 lg:pb-20">
          <div className="wrap max-w-[760px]">
            <Reveal>
              <div className="prose-site border-t border-line pt-8">
                {post.body.map((paragraph) => (
                  <p key={paragraph.slice(0, 40)}>{paragraph}</p>
                ))}
              </div>
            </Reveal>

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

      <section className="border-t border-line py-14 lg:py-20">
        <div className="wrap">
          <h2 className="mb-6 text-[clamp(1.5rem,3vw,2rem)] tracking-[-0.04em]">
            Keep reading
          </h2>
          <ul className="grid gap-4 sm:grid-cols-2">
            {related.map((item) => (
              <li key={item.slug}>
                <Link
                  href={`/blog/${item.slug}`}
                  className="flex h-full flex-col rounded-[18px] border border-line p-5 transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-soft"
                >
                  <span className="mb-2 text-xs font-bold text-violet-700">
                    {item.category}
                  </span>
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
    </>
  );
}
