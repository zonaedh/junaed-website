import Link from "next/link";
import type { Metadata } from "next";
import Image from "next/image";
import { ArrowUpRight, ButtonLink } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Reveal } from "@/components/ui/reveal";
import { SectionHead } from "@/components/ui/section-head";
import { ServiceCard } from "@/components/site/service-card";
import { ProjectCard } from "@/components/site/project-card";
import { projects, services } from "@/lib/content";
import { getPageContent } from "@/lib/pages";
import { resolveMediaAsset } from "@/lib/media/repository";
import { listFeaturedPortfolio } from "@/lib/portfolio/repository";
import { buildMetadata } from "@/lib/seo/metadata";
import { getSeoDefaults } from "@/lib/seo/repository";
import {
  personSchema,
  professionalServiceSchema,
  websiteSchema,
} from "@/lib/seo/core";
import { JsonLd } from "@/components/seo/json-ld";

/**
 * Hero visual.
 *
 * When the editor has chosen a hero image in admin, it is rendered here. With
 * no image the original illustrated composition stays, so the page never shows
 * an empty box or a fake portrait.
 */
function HeroVisual({ imageUrl, imageAlt }: { imageUrl: string | null; imageAlt: string }) {
  if (imageUrl) {
    return (
      <div className="relative overflow-hidden rounded-[32px] bg-linear-145 from-violet-50 via-[#e9e4ff] to-[#d9d1ff]">
        <Image
          src={imageUrl}
          alt={imageAlt}
          width={900}
          height={1100}
          priority
          sizes="(max-width: 1024px) 100vw, 45vw"
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className="relative grid min-h-[340px] place-items-center overflow-hidden rounded-[32px] bg-linear-145 from-violet-50 via-[#e9e4ff] to-[#d9d1ff] sm:min-h-[390px] lg:min-h-[470px]"
      aria-hidden="true"
    >
      {/* Large violet orb, top right */}
      <div className="absolute -top-[55px] -right-[40px] size-[340px] rounded-full bg-linear-135 from-violet-400 to-violet-600 opacity-95" />
      {/* Soft white orb, bottom left */}
      <div className="absolute -bottom-[55px] -left-[75px] size-[220px] rounded-full bg-white/55" />

      {/* Portrait panel â€” violet base with a white sheen, as in the original */}
      <div className="absolute inset-x-[35px] top-[35px] bottom-0 z-1 flex items-end justify-center overflow-hidden rounded-t-[25px] bg-[linear-gradient(150deg,rgb(255_255_255/0.6),rgb(255_255_255/0.13)),linear-gradient(145deg,#4f22b5,#9e8cf9)] lg:inset-x-[48px] lg:top-[42px]">
        <div className="relative h-[76%] w-[65%] rounded-t-[46%] rounded-b-[12%] bg-linear-145 from-[#251b40] to-[#4d3a72] drop-shadow-[0_15px_20px_rgb(39_17_100/0.2)]">
          <div className="absolute -top-[25%] left-[27%] aspect-square w-[46%] rounded-full bg-linear-140 from-[#d8c5b4] to-[#b58d7c]" />
        </div>
      </div>

      {/* Floating cards */}
      <div className="absolute top-[17px] left-[15px] z-3 rounded-2xl border border-white/65 bg-white px-[18px] py-[15px] shadow-float lg:top-[30px] lg:left-[25px]">
        <strong className="block text-sm font-bold">Creative meets strategy</strong>
        <small className="text-[11px] text-muted">
          Ideas built to move brands forward
        </small>
      </div>

      <div className="absolute right-[12px] bottom-[15px] z-3 flex items-center gap-3 rounded-2xl border border-white/65 bg-white px-[18px] py-[15px] shadow-float lg:right-[22px] lg:bottom-[28px]">
        <span className="grid size-9 place-items-center rounded-xl bg-violet-50 text-lg text-violet-700">
          âœ¦
        </span>
        <div>
          <strong className="block text-sm font-bold">Digital growth</strong>
          <small className="text-[11px] text-muted">
            Design Â· Strategy Â· Results
          </small>
        </div>
      </div>
    </div>
  );
}

export async function generateMetadata(): Promise<Metadata> {
  const content = await getPageContent("home");
  return buildMetadata({
    title: content.heroHeading || "Digital Growth & Creative Solutions",
    description: content.heroSubheading,
    path: "/",
    image: content.heroImage ? undefined : undefined,
    // The home page is the brand itself, so it keeps the site name in the
    // title rather than dropping it the way an inner page would.
    titleTemplate: "%s | Junaed Hossain",
  });
}

export default async function HomePage() {
  const content = await getPageContent("home");
  const seo = await getSeoDefaults();

  // Portfolio comes from the database once anything is published; the static
  // placeholders remain as the fallback so a fresh database still renders.
  const portfolio = await listFeaturedPortfolio(3);
  const placeholderProjects =
    portfolio.length === 0
      ? projects.filter((project) => project.featured).slice(0, 3)
      : [];

  const heroImageId = Number(content.heroImage) || null;
  const heroImage = await resolveMediaAsset(heroImageId);

  return (
    <>
      <JsonLd
        nodes={[
          personSchema({
            name: seo.siteName,
            url: seo.siteUrl,
            jobTitle: "Digital Marketing Consultant",
            description: seo.siteDescription,
            email: seo.contactEmail || undefined,
            sameAs: seo.socialLinks,
          }),
          websiteSchema({
            name: seo.siteName,
            url: seo.siteUrl,
            description: seo.defaultDescription,
            publisherName: seo.siteName,
          }),
          professionalServiceSchema({
            name: seo.siteName,
            url: seo.siteUrl,
            description: seo.siteDescription,
            email: seo.contactEmail || undefined,
            telephone: seo.contactPhone || undefined,
            services: services.map((service) => service.title),
          }),
        ]}
      />
      {/* ---------------- Hero ---------------- */}
      <section className="pt-9 pb-14 lg:pt-12 lg:pb-[78px]">
        <div className="wrap grid items-center gap-9 lg:grid-cols-[1.05fr_0.95fr] lg:gap-[60px]">
          <Reveal>
            <Eyebrow>{content.heroEyebrow}</Eyebrow>
            <h1 className="mt-5 mb-[22px] max-w-[700px] text-[clamp(2.625rem,6vw,4.75rem)] leading-[1.04] tracking-[-0.055em]">
              {content.heroHeading}{" "}
              <span className="text-violet-600">{content.heroHighlight}</span>
            </h1>
            <p className="max-w-[570px] text-[17px] leading-[1.7] text-muted sm:text-lg sm:leading-[1.75]">
              {content.heroParagraph}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <ButtonLink href="/contact">
                {content.heroPrimaryCta} <ArrowUpRight />
              </ButtonLink>
              <ButtonLink href="/portfolio" variant="light">
                {content.heroSecondaryCta}
              </ButtonLink>
            </div>
            <p className="mt-[30px] flex items-center gap-3 text-sm text-muted">
              <span
                aria-hidden="true"
                className="size-[9px] rounded-full bg-[#42c88a] shadow-[0_0_0_5px_rgb(66_200_138/0.13)]"
              />
              {content.availabilityNote}
            </p>
          </Reveal>

          <Reveal delay={80}>
            <HeroVisual
              imageUrl={heroImage?.url ?? null}
              imageAlt={heroImage?.alt ?? ""}
            />
          </Reveal>
        </div>
      </section>

      {/* ---------------- Services ---------------- */}
      <section className="bg-surface py-16 lg:py-[85px]" id="services">
        <div className="wrap">
          <Reveal>
            <SectionHead
              eyebrow={content.servicesEyebrow}
              title={content.servicesTitle}
              highlight={content.servicesHighlight}
              className="mb-10 lg:mb-[42px]"
            >
              {content.servicesIntro}
            </SectionHead>
          </Reveal>

          <ul className="grid gap-[17px] sm:grid-cols-2 xl:grid-cols-4">
            {services.map((service, index) => (
              <Reveal as="li" key={service.slug} delay={index * 60}>
                <ServiceCard service={service} />
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------------- Portfolio ---------------- */}
      <section className="py-16 lg:py-[85px]" id="portfolio">
        <div className="wrap">
          <Reveal>
            <SectionHead
              eyebrow={content.portfolioEyebrow}
              title={content.portfolioTitle}
              highlight={content.portfolioHighlight}
              className="mb-10 lg:mb-[42px]"
            >
              {content.portfolioIntro}
            </SectionHead>
          </Reveal>

          <ul className="grid gap-[22px] sm:grid-cols-2 lg:grid-cols-3">
            {portfolio.length > 0
              ? portfolio.map((project, index) => (
                  <Reveal as="li" key={project.id} delay={index * 70}>
                    <article className="group relative flex h-full flex-col overflow-hidden rounded-[23px] border border-line transition duration-200 ease-out hover:-translate-y-1 hover:shadow-soft">
                      {project.coverUrl ? (
                        <Image
                          src={project.coverUrl}
                          alt={project.coverAlt}
                          width={800}
                          height={560}
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          className="h-[210px] w-full object-cover sm:h-[230px]"
                        />
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
                        <h3 className="mb-2 text-[20px] leading-[1.25] tracking-[-0.03em]">
                          <Link
                            href={`/portfolio/${project.slug}`}
                            className="after:absolute after:inset-0 after:content-['']"
                          >
                            {project.title}
                          </Link>
                        </h3>
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
                ))
              : placeholderProjects.map((project, index) => (
                  <Reveal as="li" key={project.slug} delay={index * 70}>
                    <ProjectCard project={project} />
                  </Reveal>
                ))}
          </ul>

          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
            <ButtonLink href="/portfolio" variant="light">
              View all work
            </ButtonLink>
            {portfolio.length === 0 ? (
              <p className="text-xs text-muted">
                Portfolio previews are illustrative placeholders until real case
                studies are published.
              </p>
            ) : null}
          </div>
        </div>
      </section>

      {/* ---------------- About ---------------- */}
      <section
        className="relative overflow-hidden bg-violet-950 py-16 text-white lg:py-[85px]"
        id="about"
      >
        <div
          aria-hidden="true"
          className="absolute -top-[160px] -right-[160px] size-[400px] rounded-full bg-violet-500/20"
        />
        <div className="wrap relative z-1 grid items-center gap-9 lg:grid-cols-[0.9fr_1.1fr] lg:gap-[70px]">
          <Reveal>
            <div className="flex min-h-[270px] flex-col justify-between rounded-[30px] border border-white/12 bg-linear-145 from-violet-700 to-violet-950 p-7 lg:min-h-[330px] lg:p-[38px]">
              <div
                aria-hidden="true"
                className="font-display text-[80px] leading-none font-extrabold text-white/13 lg:text-[110px]"
              >
                JH.
              </div>
              <p className="font-display text-[22px] leading-[1.35] font-bold lg:text-[25px]">
                &ldquo;Creative thinking. Clear strategy. Work that makes a
                difference.&rdquo;
              </p>
            </div>
          </Reveal>

          <Reveal delay={80}>
            <Eyebrow tone="light">{content.aboutEyebrow}</Eyebrow>
            <h2 className="mt-[15px] mb-5 text-[clamp(2.25rem,4.2vw,3.25rem)] leading-[1.1] tracking-[-0.045em]">
              {content.aboutHeading}
              <br />
              I make digital work{" "}
              <span className="text-violet-300">{content.aboutHighlight}</span>
            </h2>
            <p className="text-[17px] leading-[1.8] text-[#d8d2ee]">
              {content.aboutParagraph}
            </p>

            <ul className="mt-[26px] grid gap-3 sm:grid-cols-2">
              {[
                {
                  title: "Strategy first",
                  body: "Every project starts with understanding your goals.",
                },
                {
                  title: "Creative thinking",
                  body: "Ideas that feel fresh, clear, and purposeful.",
                },
                {
                  title: "Built for people",
                  body: "Simple experiences for real audiences.",
                },
                {
                  title: "Focused on growth",
                  body: "Better foundations for what comes next.",
                },
              ].map((point) => (
                <li
                  key={point.title}
                  className="rounded-[14px] border border-white/14 bg-white/4 p-[15px] text-sm leading-[1.6] text-[#eee]"
                >
                  <b className="mb-1.5 block font-bold text-white">
                    {point.title}
                  </b>
                  {point.body}
                </li>
              ))}
            </ul>

            <Link
              href="/about"
              className="mt-7 inline-flex min-h-11 items-center gap-1.5 text-sm font-bold text-violet-300 hover:text-white"
            >
              More about me <span aria-hidden="true">â†’</span>
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ---------------- CTA ---------------- */}
      <section className="py-14 lg:py-20">
        <div className="wrap">
          <Reveal>
            <div className="relative flex flex-col items-start justify-between gap-6 overflow-hidden rounded-[30px] bg-linear-120 from-violet-800 to-violet-950 p-7 text-white sm:p-10 lg:flex-row lg:items-center lg:p-[54px]">
              <div
                aria-hidden="true"
                className="absolute -top-[180px] right-[30%] size-[300px] rounded-full border border-white/8"
              />
              <div className="relative">
                <Eyebrow tone="light">{content.ctaEyebrow}</Eyebrow>
                <h2 className="mt-3 mb-3 text-[clamp(2.125rem,4.2vw,3.125rem)] leading-[1.12] tracking-[-0.045em]">
                  {content.ctaHeading}
                </h2>
                <p className="max-w-[560px] text-[17px] leading-[1.75] text-[#ded6ff]">
                  {content.ctaParagraph}
                </p>
              </div>
              <ButtonLink
                href="/contact"
                variant="light"
                className="relative z-1 shrink-0"
              >
                {content.ctaButton} <ArrowUpRight />
              </ButtonLink>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
