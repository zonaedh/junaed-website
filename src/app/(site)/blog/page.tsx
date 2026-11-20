import type { Metadata } from "next";
import Link from "next/link";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Reveal } from "@/components/ui/reveal";
import { formatDate, posts } from "@/lib/content";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Notes on digital marketing, SEO, design and WordPress — practical observations from client work.",
  alternates: { canonical: "/blog" },
};

export default function BlogPage() {
  const sorted = [...posts].sort((a, b) =>
    a.publishedAt < b.publishedAt ? 1 : -1,
  );

  return (
    <>
      <section className="pt-10 pb-12 lg:pt-16 lg:pb-14">
        <div className="wrap">
          <Reveal>
            <Eyebrow>Writing</Eyebrow>
            <h1 className="mt-5 mb-5 max-w-[820px] text-[clamp(2.5rem,5.5vw,4rem)] leading-[1.06] tracking-[-0.05em]">
              Notes from{" "}
              <span className="text-violet-600">client work.</span>
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
          <ul className="divide-y divide-line border-y border-line">
            {sorted.map((post, index) => (
              <Reveal as="li" key={post.slug} delay={index * 50}>
                <article className="group relative py-7">
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
                  <h2 className="mt-3 mb-2 text-[clamp(1.375rem,2.5vw,1.75rem)] leading-[1.25] tracking-[-0.035em]">
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
                </article>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
