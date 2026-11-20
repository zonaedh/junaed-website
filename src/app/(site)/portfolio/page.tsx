import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Reveal } from "@/components/ui/reveal";
import { ProjectCard } from "@/components/site/project-card";
import { projects } from "@/lib/content";

export const metadata: Metadata = {
  title: "Portfolio",
  description:
    "Selected digital marketing, SEO, design and WordPress work. Case studies with the problem, the approach and what changed.",
  alternates: { canonical: "/portfolio" },
};

export default function PortfolioPage() {
  return (
    <>
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
          <ul className="grid gap-[22px] sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project, index) => (
              <Reveal as="li" key={project.slug} delay={index * 70}>
                <ProjectCard project={project} />
              </Reveal>
            ))}
          </ul>

          <p className="mt-8 max-w-[640px] text-sm leading-[1.7] text-muted">
            <strong className="font-bold text-ink">Note:</strong> the projects
            above are illustrative placeholders. Real case studies with client
            names, screenshots and measured results replace them once approved
            for publication.
          </p>
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
