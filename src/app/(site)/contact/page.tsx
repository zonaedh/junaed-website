import type { Metadata } from "next";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Reveal } from "@/components/ui/reveal";
import { ContactForm } from "@/components/site/contact-form";
import { getPageContent } from "@/lib/pages";
import { getSettings } from "@/lib/settings";
import { createChallenge } from "@/lib/contact/captcha";
import { buildMetadata } from "@/lib/seo/metadata";
import { getSeoDefaults } from "@/lib/seo/repository";
import { breadcrumbList, contactPageSchema } from "@/lib/seo/core";
import { JsonLd } from "@/components/seo/json-ld";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Contact",
    description:
      "Tell me about your project. Digital marketing, SEO, design and WordPress work for growing brands.",
    path: "/contact",
  });
}

export default async function ContactPage() {
  const [content, settings] = await Promise.all([
    getPageContent("contact"),
    getSettings(),
  ]);
  // The captcha challenge is generated on the server so the answer never
  // reaches the client in a readable form.
  const challenge = createChallenge();
  const seo = await getSeoDefaults();

  return (
    <>
      <JsonLd
        nodes={[
          contactPageSchema({
            name: `Contact ${seo.siteName}`,
            url: `${seo.siteUrl.replace(/\/+$/, "")}/contact`,
            description: seo.defaultDescription,
            email: seo.contactEmail || undefined,
            telephone: seo.contactPhone || undefined,
          }),
          breadcrumbList(
            [
              { name: "Home", path: "/" },
              { name: "Contact", path: "/contact" },
            ],
            seo.siteUrl,
          ),
        ]}
      />
      <section className="bg-surface py-14 lg:py-[75px]">
      <div className="wrap grid gap-10 lg:grid-cols-2 lg:gap-[50px]">
        <Reveal>
          <Eyebrow>{content.eyebrow}</Eyebrow>
          <h1 className="mt-4 mb-4 text-[clamp(2.25rem,4.3vw,3rem)] leading-[1.1] tracking-[-0.045em]">
            {content.heading}
          </h1>
          <p className="max-w-[480px] text-[17px] leading-[1.75] text-muted">
            {content.intro}
          </p>

          <div className="mt-6 grid gap-3">
            <a
              href={`mailto:${settings.email}`}
              className="flex items-center gap-3.5 rounded-[15px] border border-line bg-white p-4 transition hover:border-violet-200 hover:shadow-soft"
            >
              <span
                aria-hidden="true"
                className="grid size-10 shrink-0 place-items-center rounded-[13px] bg-violet-50 text-lg text-violet-700"
              >
                âœ‰
              </span>
              <span>
                <small className="mb-0.5 block text-[13px] text-muted">
                  Email me
                </small>
                <b className="text-[15px] font-bold">{settings.email}</b>
              </span>
            </a>

            <div className="flex items-center gap-3.5 rounded-[15px] border border-line bg-white p-4">
              <span
                aria-hidden="true"
                className="grid size-10 shrink-0 place-items-center rounded-[13px] bg-violet-50 text-lg text-violet-700"
              >
                â±
              </span>
              <span>
                <small className="mb-0.5 block text-[13px] text-muted">
                  Response time
                </small>
                <b className="text-[15px] font-bold">{content.responseTime}</b>
              </span>
            </div>
          </div>
        </Reveal>

        <Reveal delay={80}>
          <ContactForm
            initialChallenge={{
              question: challenge.question,
              token: challenge.token,
            }}
          />
        </Reveal>
      </div>
      </section>
    </>
  );
}
