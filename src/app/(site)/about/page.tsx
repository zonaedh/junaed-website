import type { Metadata } from "next";
import { ArrowUpRight, ButtonLink } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Reveal } from "@/components/ui/reveal";
import { SectionHead } from "@/components/ui/section-head";

export const metadata: Metadata = {
  title: "About",
  description:
    "Junaed Hossain is a digital marketer and creative problem-solver working across strategy, SEO, design and WordPress for growing brands.",
  alternates: { canonical: "/about" },
};

const principles = [
  {
    title: "Strategy first",
    body: "Every project starts with understanding your goals, not with a deliverable list.",
  },
  {
    title: "Creative thinking",
    body: "Ideas that feel fresh, clear, and purposeful rather than decorative.",
  },
  {
    title: "Built for people",
    body: "Simple experiences for real audiences, on the devices they actually use.",
  },
  {
    title: "Focused on growth",
    body: "Better foundations for what comes next, not just a nicer-looking surface.",
  },
];

const capabilities = [
  { label: "Digital marketing", detail: "Campaign strategy, paid social, reporting" },
  { label: "Search", detail: "Technical SEO, keyword mapping, content briefs" },
  { label: "Design", detail: "Brand visuals, social templates, presentation design" },
  { label: "WordPress", detail: "Custom themes, performance, editor-friendly builds" },
];

export default function AboutPage() {
  return (
    <>
      <section className="pt-10 pb-12 lg:pt-16 lg:pb-16">
        <div className="wrap grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          <Reveal>
            <Eyebrow>A little about me</Eyebrow>
            <h1 className="mt-5 mb-5 text-[clamp(2.25rem,5vw,3.75rem)] leading-[1.07] tracking-[-0.05em]">
              Hey, I&rsquo;m Junaed. I make digital work{" "}
              <span className="text-violet-600">work harder.</span>
            </h1>
            <div className="space-y-4 text-[17px] leading-[1.8] text-[#3c3948]">
              <p>
                I&rsquo;m a digital marketer and creative problem-solver who
                enjoys helping brands make sense of the online world. My work
                brings together strategy, creativity, and practical execution, so
                businesses can build a presence they&rsquo;re proud of and grow
                with confidence.
              </p>
              <p>
                I have spent most of my working life at the point where marketing
                meets design and engineering: campaigns that need a landing page,
                sites that need to rank, brands that need to look like they mean
                it. That overlap is where most projects quietly succeed or fail,
                and it is where I am most useful.
              </p>
              <p>
                I work with a small number of clients at a time, on purpose. It
                means I can be honest about scope, direct about what will not
                work, and still be around when the thing launches.
              </p>
            </div>
            <div className="mt-7 flex flex-wrap gap-3">
              <ButtonLink href="/contact">
                Work with me <ArrowUpRight />
              </ButtonLink>
              <ButtonLink href="/portfolio" variant="light">
                See my work
              </ButtonLink>
            </div>
          </Reveal>

          <Reveal delay={80}>
            <div className="relative overflow-hidden rounded-[30px] bg-linear-145 from-violet-700 to-violet-950 p-8 text-white lg:p-10">
              <div
                aria-hidden="true"
                className="absolute -top-16 -right-16 size-56 rounded-full bg-violet-400/20"
              />
              <div
                aria-hidden="true"
                className="font-display text-[80px] leading-none font-extrabold text-white/15"
              >
                JH.
              </div>
              <p className="relative mt-6 font-display text-[22px] leading-[1.35] font-bold lg:text-[25px]">
                &ldquo;Creative thinking. Clear strategy. Work that makes a
                difference.&rdquo;
              </p>
              <p className="relative mt-4 text-sm leading-[1.7] text-violet-200">
                The three things I check before calling any project finished.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="bg-surface py-16 lg:py-[85px]">
        <div className="wrap">
          <Reveal>
            <SectionHead
              eyebrow="How I work"
              title="Four principles, applied"
              highlight="consistently."
              className="mb-10 lg:mb-[42px]"
            >
              These are not values on a wall. They are the four questions I ask
              before recommending anything.
            </SectionHead>
          </Reveal>
          <ul className="grid gap-4 sm:grid-cols-2">
            {principles.map((item, index) => (
              <Reveal as="li" key={item.title} delay={index * 60}>
                <div className="h-full rounded-[22px] border border-line bg-white p-6">
                  <h3 className="mb-2 text-lg tracking-[-0.03em]">{item.title}</h3>
                  <p className="text-[15px] leading-[1.7] text-muted">
                    {item.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      <section className="py-16 lg:py-[85px]">
        <div className="wrap grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <Reveal>
            <h2 className="text-[clamp(1.75rem,3.5vw,2.5rem)] leading-[1.15] tracking-[-0.045em]">
              What I actually do
            </h2>
            <p className="mt-3 text-[17px] leading-[1.75] text-muted">
              Four capabilities, usually combined rather than sold separately.
            </p>
          </Reveal>
          <Reveal delay={80}>
            <dl className="divide-y divide-line border-y border-line">
              {capabilities.map((item) => (
                <div
                  key={item.label}
                  className="flex flex-col gap-1 py-5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6"
                >
                  <dt className="font-display text-lg font-bold tracking-[-0.03em]">
                    {item.label}
                  </dt>
                  <dd className="text-[15px] text-muted sm:text-right">
                    {item.detail}
                  </dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>
      </section>
    </>
  );
}
