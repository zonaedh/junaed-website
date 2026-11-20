import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, ButtonLink } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Reveal } from "@/components/ui/reveal";
import { PostBody } from "@/components/site/post-body";
import {
  getPublishedPortfolioItem,
  listPublishedPortfolio,
} from "@/lib/portfolio/repository";

type Params = { slug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = await getPublishedPortfolioItem(slug);
  if (!project) return { title: "Project not found" };

  const title = project.seoTitle || project.title;
  const description = project.seoDescription || project.summary;

  return {
    title,
    description,
    alternates: { canonical: `/portfolio/${project.slug}` },
    robots: project.noindex ? { index: false, follow: false } : undefined,
    openGraph: {
      title,
      description,
      url: `/portfolio/${project.slug}`,
      type: "article",
      images: project.coverUrl
        ? [{ url: project.coverUrl, alt: project.coverAlt }]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: project.coverUrl ? [project.coverUrl] : undefined,
    },
  };
}

/**
 * Public case study (MVP.md §4.2).
 *
 * No generateStaticParams: a newly published project must be reachable at once,
 * and the tagged cache already makes repeat views cheap.
 */
export default async function ProjectPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const project = await getPublishedPortfolioItem(slug);
  if (!project) notFound();

  const all = await listPublishedPortfolio();
  const others = all.filter((item) => item.slug !== project.slug).slice(0, 2);

  return (
    <>
      <section className="pt-10 pb-10 lg:pt-16 lg:pb-12">
        <div className="wrap">
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
                  <Link href="/portfolio" className="hover:text-violet-700">
                    Portfolio
                  </Link>
                </li>
                <li aria-hidden="true">/</li>
                <li aria-current="page" className="text-ink">
                  {project.title}
                </li>
              </ol>
            </nav>

            <Eyebrow>Case study</Eyebrow>
            <h1 className="mt-4 mb-5 max-w-[820px] text-[clamp(2.25rem,5vw,3.75rem)] leading-[1.07] tracking-[-0.05em]">
              {project.title}
            </h1>
            <p className="max-w-[640px] text-[17px] leading-[1.75] text-muted">
              {project.summary}
            </p>

            <dl className="mt-8 grid gap-4 border-t border-line pt-6 sm:grid-cols-3">
              {project.client ? (
                <div>
                  <dt className="text-xs font-bold tracking-[0.1em] text-muted uppercase">
                    Client
                  </dt>
                  <dd className="mt-1 text-[15px] font-semibold">
                    {project.client}
                  </dd>
                </div>
              ) : null}
              {project.year ? (
                <div>
                  <dt className="text-xs font-bold tracking-[0.1em] text-muted uppercase">
                    Year
                  </dt>
                  <dd className="mt-1 text-[15px] font-semibold">
                    {project.year}
                  </dd>
                </div>
              ) : null}
              {project.tags.length > 0 ? (
                <div>
                  <dt className="text-xs font-bold tracking-[0.1em] text-muted uppercase">
                    Focus
                  </dt>
                  <dd className="mt-1 flex flex-wrap gap-1.5">
                    {project.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-bold text-violet-800"
                      >
                        {tag}
                      </span>
                    ))}
                  </dd>
                </div>
              ) : null}
            </dl>
          </Reveal>
        </div>
      </section>

      {project.coverUrl ? (
        <div className="wrap pb-10">
          <Reveal>
            <div className="overflow-hidden rounded-[24px]">
              <Image
                src={project.coverUrl}
                alt={project.coverAlt}
                width={1600}
                height={900}
                priority
                sizes="(max-width: 1280px) 100vw, 1200px"
                className="h-auto w-full object-cover"
              />
            </div>
          </Reveal>
        </div>
      ) : null}

      <section className="pb-16 lg:pb-[85px]">
        <div className="wrap grid gap-10 lg:grid-cols-[1.4fr_0.6fr] lg:gap-16">
          <div className="max-w-[680px]">
            <Reveal>
              <PostBody doc={project.content} />
            </Reveal>

            {project.galleryUrls.length > 0 ? (
              <Reveal>
                <ul className="mt-10 grid gap-3 sm:grid-cols-2">
                  {project.galleryUrls.map((image, index) => (
                    <li key={`${image.url}-${index}`} className="overflow-hidden rounded-[16px]">
                      <Image
                        src={image.url}
                        alt={image.alt}
                        width={800}
                        height={600}
                        sizes="(max-width: 640px) 100vw, 340px"
                        className="h-auto w-full object-cover"
                      />
                    </li>
                  ))}
                </ul>
              </Reveal>
            ) : null}

            {project.externalUrl ? (
              <Reveal>
                <a
                  href={project.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-8 inline-flex items-center gap-1.5 text-sm font-bold text-violet-800 hover:underline"
                >
                  Visit the live project <ArrowUpRight />
                </a>
              </Reveal>
            ) : null}
          </div>

          <Reveal delay={80}>
            <aside className="rounded-[24px] border border-line bg-surface p-6 lg:sticky lg:top-8">
              {project.results.length > 0 ? (
                <>
                  <h2 className="mb-4 text-lg tracking-[-0.03em]">At a glance</h2>
                  <dl className="space-y-4">
                    {project.results.map((result) => (
                      <div key={result.label}>
                        <dt className="text-sm text-muted">{result.label}</dt>
                        <dd className="font-display text-xl font-extrabold tracking-[-0.03em] text-violet-950">
                          {result.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </>
              ) : null}
              <ButtonLink
                href="/contact"
                className={project.results.length > 0 ? "mt-6 w-full" : "w-full"}
              >
                Discuss a similar project <ArrowUpRight />
              </ButtonLink>
            </aside>
          </Reveal>
        </div>
      </section>

      {others.length > 0 ? (
        <section className="border-t border-line py-14 lg:py-20">
          <div className="wrap">
            <h2 className="mb-6 text-[clamp(1.5rem,3vw,2rem)] tracking-[-0.04em]">
              More work
            </h2>
            <ul className="grid gap-4 sm:grid-cols-2">
              {others.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/portfolio/${item.slug}`}
                    className="flex h-full flex-col rounded-[18px] border border-line p-5 transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-soft"
                  >
                    <h3 className="mb-1.5 text-base tracking-[-0.02em]">
                      {item.title}
                    </h3>
                    <p className="text-sm leading-[1.65] text-muted">
                      {item.summary}
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
