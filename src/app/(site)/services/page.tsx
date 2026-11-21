import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Reveal } from "@/components/ui/reveal";
import { SectionHead } from "@/components/ui/section-head";
import { ServiceCard } from "@/components/site/service-card";
import { services } from "@/lib/content";
import { buildMetadata } from "@/lib/seo/metadata";
import { getSeoDefaults } from "@/lib/seo/repository";
import { breadcrumbList } from "@/lib/seo/core";
import { JsonLd } from "@/components/seo/json-ld";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Services",
    description:
      "Digital marketing, SEO, graphic design and WordPress customization for growing brands. Clear scope, honest timelines, work that compounds.",
    path: "/services",
  });
}

export default async function ServicesPage() {
  const seo = await getSeoDefaults();

  return (
    <>
      <JsonLd
        nodes={breadcrumbList(
          [
            { name: "Home", path: "/" },
            { name: "Services", path: "/services" },
          ],
          seo.siteUrl,
        )}
      />
      <section className="pt-10 pb-12 lg:pt-16 lg:pb-16">
        <div className="wrap">
          <Reveal>
            <Eyebrow>What I do</Eyebrow>
            <h1 className="mt-5 mb-5 max-w-[820px] text-[clamp(2.5rem,5.5vw,4rem)] leading-[1.06] tracking-[-0.05em]">
              Four services. One goal:{" "}
              <span className="text-violet-600">growth you can measure.</span>
            </h1>
            <p className="max-w-[640px] text-[17px] leading-[1.75] text-muted">
              I keep the offer deliberately narrow. These are the four things I
              do well, and each one is scoped so you know exactly what you are
              buying before we start.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="pb-16 lg:pb-[85px]">
        <div className="wrap">
          <ul className="grid gap-[17px] sm:grid-cols-2">
            {services.map((service, index) => (
              <Reveal as="li" key={service.slug} delay={index * 60}>
                <ServiceCard service={service} />
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-surface py-16 lg:py-[85px]">
        <div className="wrap">
          <Reveal>
            <SectionHead
              eyebrow="How it works"
              title="A short, predictable"
              highlight="process."
              className="mb-10 lg:mb-[42px]"
            >
              No discovery phase that runs for six weeks. No surprise invoices.
              Four steps, and you can stop at any of them.
            </SectionHead>
          </Reveal>

          <ol className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                step: "01",
                title: "Conversation",
                body: "A short call to understand the business, the goal, and what has already been tried.",
              },
              {
                step: "02",
                title: "Audit & scope",
                body: "I look at what exists, then send a written scope with deliverables, timeline and price.",
              },
              {
                step: "03",
                title: "Build",
                body: "Work happens in the open, with a check-in at the halfway point so nothing drifts.",
              },
              {
                step: "04",
                title: "Handover",
                body: "You get the files, the documentation, and a walkthrough. Nothing is locked to me.",
              },
            ].map((item, index) => (
              <Reveal as="li" key={item.step} delay={index * 60}>
                <div className="h-full rounded-[22px] border border-line bg-white p-6">
                  <span
                    aria-hidden="true"
                    className="font-display text-sm font-extrabold tracking-[0.08em] text-violet-400"
                  >
                    {item.step}
                  </span>
                  <h3 className="mt-3 mb-2 text-lg tracking-[-0.03em]">
                    {item.title}
                  </h3>
                  <p className="text-[15px] leading-[1.7] text-muted">
                    {item.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      <section className="py-14 lg:py-20">
        <div className="wrap">
          <Reveal>
            <div className="rounded-[30px] bg-linear-120 from-violet-800 to-violet-950 p-8 text-white sm:p-12">
              <h2 className="text-[clamp(1.75rem,3.5vw,2.5rem)] leading-[1.15] tracking-[-0.045em]">
                Not sure which one you need?
              </h2>
              <p className="mt-3 max-w-[560px] text-[17px] leading-[1.75] text-[#ded6ff]">
                Tell me the problem in plain language. If the answer is
                &ldquo;none of these&rdquo;, I will say so.
              </p>
              <ButtonLink href="/contact" variant="light" className="mt-6">
                Start a conversation
              </ButtonLink>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
