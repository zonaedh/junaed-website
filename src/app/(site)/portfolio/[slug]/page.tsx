import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, ButtonLink } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Reveal } from "@/components/ui/reveal";
import { getProject, projects } from "@/lib/content";

type Params = { slug: string };

export function generateStaticParams(): Params[] {
  return projects.map((project) => ({ slug: project.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) return { title: "Project not found" };

  return {
    title: project.title,
    description: project.summary,
    alternates: { canonical: `/portfolio/${project.slug}` },
    openGraph: {
      title: `${project.title} — Junaed Hossain`,
      description: project.summary,
      url: `/portfolio/${project.slug}`,
      type: "article",
    },
  };
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) notFound();

  const others = projects.filter((item) => item.slug !== project.slug);

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
              <div>
                <dt className="text-xs font-bold tracking-[0.1em] text-muted uppercase">
                  Client
                </dt>
                <dd className="mt-1 text-[15px] font-semibold">
                  {project.client}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold tracking-[0.1em] text-muted uppercase">
                  Year
                </dt>
                <dd className="mt-1 text-[15px] font-semibold">{project.year}</dd>
              </div>
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
            </dl>
          </Reveal>
        </div>
      </section>

      <section className="pb-16 lg:pb-[85px]">
        <div className="wrap grid gap-10 lg:grid-cols-[1.4fr_0.6fr] lg:gap-16">
          <div className="max-w-[680px]">
            <Reveal>
              <h2 className="mb-3 text-[clamp(1.5rem,3vw,2rem)] tracking-[-0.04em]">
                The challenge
              </h2>
              <p className="text-[17px] leading-[1.8] text-[#3c3948]">
                {project.challenge}
              </p>
            </Reveal>

            <Reveal>
              <h2 className="mt-10 mb-3 text-[clamp(1.5rem,3vw,2rem)] tracking-[-0.04em]">
                The approach
              </h2>
              <ol className="space-y-4">
                {project.approach.map((step, index) => (
                  <li key={step.slice(0, 30)} className="flex gap-4">
                    <span
                      aria-hidden="true"
                      className="grid size-7 shrink-0 place-items-center rounded-full bg-violet-950 text-xs font-bold text-white"
                    >
                      {index + 1}
                    </span>
                    <p className="text-[17px] leading-[1.75] text-[#3c3948]">
                      {step}
                    </p>
                  </li>
                ))}
              </ol>
            </Reveal>
          </div>

          <Reveal delay={80}>
            <aside className="rounded-[24px] border border-line bg-surface p-6 lg:sticky lg:top-8">
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
              <ButtonLink href="/contact" className="mt-6 w-full">
                Discuss a similar project <ArrowUpRight />
              </ButtonLink>
            </aside>
          </Reveal>
        </div>
      </section>

      <section className="border-t border-line py-14 lg:py-20">
        <div className="wrap">
          <h2 className="mb-6 text-[clamp(1.5rem,3vw,2rem)] tracking-[-0.04em]">
            More work
          </h2>
          <ul className="grid gap-4 sm:grid-cols-2">
            {others.map((item) => (
              <li key={item.slug}>
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
    </>
  );
}
