import Link from "next/link";
import { ArrowUpRight, ButtonLink } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Reveal } from "@/components/ui/reveal";
import { SectionHead } from "@/components/ui/section-head";
import { ServiceCard } from "@/components/site/service-card";
import { ProjectCard } from "@/components/site/project-card";
import { projects, services } from "@/lib/content";

/**
 * Hero visual. Phase 3 replaces the whole block with an <Image> fed from the
 * media library (settings.hero_image). Until a real photo exists, this keeps
 * the original composition rather than shipping a fake portrait.
 */
function HeroVisual() {
  return (
    <div
      className="relative grid min-h-[340px] place-items-center overflow-hidden rounded-[32px] bg-linear-145 from-violet-50 via-[#e9e4ff] to-[#d9d1ff] sm:min-h-[390px] lg:min-h-[470px]"
      aria-hidden="true"
    >
      {/* Large violet orb, top right */}
      <div className="absolute -top-[55px] -right-[40px] size-[340px] rounded-full bg-linear-135 from-violet-400 to-violet-600 opacity-95" />
      {/* Soft white orb, bottom left */}
      <div className="absolute -bottom-[55px] -left-[75px] size-[220px] rounded-full bg-white/55" />

      {/* Portrait panel — violet base with a white sheen, as in the original */}
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
          ✦
        </span>
        <div>
          <strong className="block text-sm font-bold">Digital growth</strong>
          <small className="text-[11px] text-muted">
            Design · Strategy · Results
          </small>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const featured = projects.filter((project) => project.featured).slice(0, 3);

  return (
    <>
      {/* ---------------- Hero ---------------- */}
      <section className="pt-9 pb-14 lg:pt-12 lg:pb-[78px]">
        <div className="wrap grid items-center gap-9 lg:grid-cols-[1.05fr_0.95fr] lg:gap-[60px]">
          <Reveal>
            <Eyebrow>Digital solutions for growing brands</Eyebrow>
            <h1 className="mt-5 mb-[22px] max-w-[700px] text-[clamp(2.625rem,6vw,4.75rem)] leading-[1.04] tracking-[-0.055em]">
              Let&rsquo;s make your brand{" "}
              <span className="text-violet-600">stand out.</span>
            </h1>
            <p className="max-w-[570px] text-[17px] leading-[1.7] text-muted sm:text-lg sm:leading-[1.75]">
              I help businesses build a stronger online presence through smart
              digital marketing, search visibility, creative design, and websites
              that work beautifully.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <ButtonLink href="/contact">
                Start a project <ArrowUpRight />
              </ButtonLink>
              <ButtonLink href="/portfolio" variant="light">
                Explore my work
              </ButtonLink>
            </div>
            <p className="mt-[30px] flex items-center gap-3 text-sm text-muted">
              <span
                aria-hidden="true"
                className="size-[9px] rounded-full bg-[#42c88a] shadow-[0_0_0_5px_rgb(66_200_138/0.13)]"
              />
              Open to new projects &amp; collaborations
            </p>
          </Reveal>

          <Reveal delay={80}>
            <HeroVisual />
          </Reveal>
        </div>
      </section>

      {/* ---------------- Services ---------------- */}
      <section className="bg-surface py-16 lg:py-[85px]" id="services">
        <div className="wrap">
          <Reveal>
            <SectionHead
              eyebrow="What I do"
              title="Everything your brand needs to"
              highlight="grow online."
              className="mb-10 lg:mb-[42px]"
            >
              From getting discovered to making a lasting impression, I bring
              together the essentials to help your business move forward.
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
              eyebrow="Selected work"
              title="Good work speaks"
              highlight="for itself."
              className="mb-10 lg:mb-[42px]"
            >
              A glimpse of the kind of digital experiences, marketing visuals, and
              growth-focused work I love creating.
            </SectionHead>
          </Reveal>

          <ul className="grid gap-[22px] sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((project, index) => (
              <Reveal as="li" key={project.slug} delay={index * 70}>
                <ProjectCard project={project} />
              </Reveal>
            ))}
          </ul>

          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
            <ButtonLink href="/portfolio" variant="light">
              View all work
            </ButtonLink>
            <p className="text-xs text-muted">
              Portfolio previews are illustrative placeholders until real case
              studies are published.
            </p>
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
            <Eyebrow tone="light">A little about me</Eyebrow>
            <h2 className="mt-[15px] mb-5 text-[clamp(2.25rem,4.2vw,3.25rem)] leading-[1.1] tracking-[-0.045em]">
              Hey, I&rsquo;m Junaed.
              <br />
              I make digital work{" "}
              <span className="text-violet-300">work harder.</span>
            </h2>
            <p className="text-[17px] leading-[1.8] text-[#d8d2ee]">
              I&rsquo;m a digital marketer and creative problem-solver who enjoys
              helping brands make sense of the online world. My work brings
              together strategy, creativity, and practical execution, so
              businesses can build a presence they&rsquo;re proud of and grow with
              confidence.
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
              More about me <span aria-hidden="true">→</span>
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
                <Eyebrow tone="light">Have something in mind?</Eyebrow>
                <h2 className="mt-3 mb-3 text-[clamp(2.125rem,4.2vw,3.125rem)] leading-[1.12] tracking-[-0.045em]">
                  Let&rsquo;s build something
                  <br />
                  great together.
                </h2>
                <p className="max-w-[560px] text-[17px] leading-[1.75] text-[#ded6ff]">
                  Have a project, a business idea, or a challenge you want to
                  solve? Tell me a little about it and let&rsquo;s see what we can
                  make happen.
                </p>
              </div>
              <ButtonLink
                href="/contact"
                variant="light"
                className="relative z-1 shrink-0"
              >
                Start a conversation <ArrowUpRight />
              </ButtonLink>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
