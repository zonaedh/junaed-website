import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, ButtonLink } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Reveal } from "@/components/ui/reveal";
import { getService, services } from "@/lib/content";

type Params = { slug: string };

export function generateStaticParams(): Params[] {
  return services.map((service) => ({ slug: service.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const service = getService(slug);
  if (!service) return { title: "Service not found" };

  return {
    title: service.title,
    description: service.summary,
    alternates: { canonical: `/services/${service.slug}` },
    openGraph: {
      title: `${service.title} — Junaed Hossain`,
      description: service.summary,
      url: `/services/${service.slug}`,
      type: "website",
    },
  };
}

export default async function ServicePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const service = getService(slug);
  if (!service) notFound();

  const others = services.filter((item) => item.slug !== service.slug);

  return (
    <>
      <section className="pt-10 pb-12 lg:pt-16 lg:pb-14">
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
                  <Link href="/services" className="hover:text-violet-700">
                    Services
                  </Link>
                </li>
                <li aria-hidden="true">/</li>
                <li aria-current="page" className="text-ink">
                  {service.title}
                </li>
              </ol>
            </nav>

            <Eyebrow>Service</Eyebrow>
            <h1 className="mt-4 mb-5 max-w-[820px] text-[clamp(2.25rem,5vw,3.75rem)] leading-[1.07] tracking-[-0.05em]">
              {service.title}
            </h1>
            <p className="max-w-[640px] text-[17px] leading-[1.75] text-muted">
              {service.summary}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <ButtonLink href="/contact">
                Discuss this service <ArrowUpRight />
              </ButtonLink>
              <ButtonLink href="/portfolio" variant="light">
                See related work
              </ButtonLink>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="pb-16 lg:pb-[85px]">
        <div className="wrap grid gap-10 lg:grid-cols-[1.4fr_0.6fr] lg:gap-16">
          <Reveal>
            <div className="prose-site max-w-[680px]">
              {service.body.map((paragraph) => (
                <p key={paragraph.slice(0, 40)}>{paragraph}</p>
              ))}
            </div>
          </Reveal>

          <Reveal delay={80}>
            <aside className="rounded-[24px] border border-line bg-surface p-6 lg:sticky lg:top-8">
              <h2 className="mb-4 text-lg tracking-[-0.03em]">
                What you get
              </h2>
              <ul className="space-y-3">
                {service.deliverables.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2.5 text-[15px] leading-[1.6] text-[#3c3948]"
                  >
                    <span
                      aria-hidden="true"
                      className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-violet-100 text-[11px] font-bold text-violet-700"
                    >
                      ✓
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
              <ButtonLink href="/contact" className="mt-6 w-full">
                Get a quote
              </ButtonLink>
            </aside>
          </Reveal>
        </div>
      </section>

      <section className="border-t border-line py-14 lg:py-20">
        <div className="wrap">
          <h2 className="mb-6 text-[clamp(1.5rem,3vw,2rem)] tracking-[-0.04em]">
            Other services
          </h2>
          <ul className="grid gap-4 sm:grid-cols-3">
            {others.map((item) => (
              <li key={item.slug}>
                <Link
                  href={`/services/${item.slug}`}
                  className="group flex h-full flex-col rounded-[18px] border border-line p-5 transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-soft"
                >
                  <span
                    aria-hidden="true"
                    className="mb-3 grid size-10 place-items-center rounded-xl bg-violet-50 text-lg text-violet-700"
                  >
                    {item.icon}
                  </span>
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
