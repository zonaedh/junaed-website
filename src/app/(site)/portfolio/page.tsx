import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Reveal } from "@/components/ui/reveal";
import { listPublishedPortfolio } from "@/lib/portfolio/repository";
import { buildMetadata } from "@/lib/seo/metadata";
import { getSeoDefaults } from "@/lib/seo/repository";
import { breadcrumbList } from "@/lib/seo/core";
import { JsonLd } from "@/components/seo/json-ld";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Portfolio",
    description:
      "Selected digital marketing, SEO, design and WordPress work. Case studies with the problem, the approach and what changed.",
    path: "/portfolio",
  });
}

/**
 * Public portfolio index (MVP.md §4.2).
 *
 * Reads published items from the database, ordered by the editor's sort order.
 * A project with a cover image shows it; one without falls back to a plain
 * card rather than a broken frame.
 */
export default async function PortfolioPage() {
  const projects = await listPublishedPortfolio();
  const seo = await getSeoDefaults();

  return (
    <>
      <JsonLd
        nodes={breadcrumbList(
          [
            { name: "Home", path: "/" },
            { name: "Portfolio", path: "/portfolio" },
          ],
          seo.siteUrl,
        )}
      />
      <section className="pt-10 pb-12 lg:pt-16 lg:pb-14">
        <div className="wrap">
          <Reveal>
            <Eyebrow>Selected work</Eyebrow>
            <h1 className="mt-5 mb-5 max-w-[820px] text-[clamp(2.5rem,5.5vw,4rem)] leading-[1.06] tracking-[-0.05em]">
              Good work speaks{" "}
              <span className="text-violet-600">for itself.</span>
            </h1>
            <p className="max-w-[640px] text-[17px] leading-[1.75] text-muted">
              A glimpse of the kind of digital experiences, marketing visuals, and
              growth-focused work I love creating.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="pb-16 lg:pb-[85px]">
        <div className="wrap">
          {projects.length === 0 ? (
            <p className="rounded-[18px] border border-dashed border-line px-5 py-14 text-center text-sm text-muted">
              No case studies published yet.
            </p>
          ) : (
            <ul className="grid gap-[22px] sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((project, index) => (
                <Reveal as="li" key={project.id} delay={index * 70}>
                  <article className="group relative flex h-full flex-col overflow-hidden rounded-[23px] border border-line transition duration-200 ease-out focus-within:border-violet-300 hover:-translate-y-1 hover:shadow-soft">
                    {project.coverUrl ? (
                      <div className="overflow-hidden">
                        <Image
                          src={project.coverUrl}
                          alt={project.coverAlt}
                          width={800}
                          height={560}
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          className="h-[210px] w-full object-cover sm:h-[230px]"
                        />
                      </div>
                    ) : (
                      <div className="grid h-[210px] place-items-center bg-linear-140 from-violet-950 to-violet-500 sm:h-[230px]">
                        <span
                          aria-hidden="true"
                          className="font-display text-4xl font-extrabold text-white/25"
                        >
                          {project.year || "—"}
                        </span>
                      </div>
                    )}

                    <div className="flex flex-1 flex-col p-[22px]">
                      <h2 className="mb-2 text-[20px] leading-[1.25] tracking-[-0.03em]">
                        <Link
                          href={`/portfolio/${project.slug}`}
                          className="after:absolute after:inset-0 after:content-['']"
                        >
                          {project.title}
                        </Link>
                      </h2>
                      <p className="mb-4 text-[15px] leading-[1.75] text-muted">
                        {project.summary}
                      </p>
                      {project.tags.length > 0 ? (
                        <ul className="mt-auto flex flex-wrap gap-[7px]">
                          {project.tags.map((tag) => (
                            <li
                              key={tag}
                              className="rounded-full bg-violet-50 px-[9px] py-1.5 text-xs font-bold text-violet-800"
                            >
                              {tag}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  </article>
                </Reveal>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="bg-surface py-14 lg:py-20">
        <div className="wrap">
          <Reveal>
            <div className="flex flex-col items-start justify-between gap-6 rounded-[30px] border border-line bg-white p-8 sm:p-12 lg:flex-row lg:items-center">
              <div>
                <h2 className="text-[clamp(1.75rem,3.5vw,2.5rem)] leading-[1.15] tracking-[-0.045em]">
                  Want to be the next one?
                </h2>
                <p className="mt-3 max-w-[520px] text-[17px] leading-[1.75] text-muted">
                  Tell me what you are working on and what is not working. I will
                  tell you honestly whether I can help.
                </p>
              </div>
              <ButtonLink href="/contact" className="shrink-0">
                Start a project
              </ButtonLink>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
