import type { Metadata } from "next";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Reveal } from "@/components/ui/reveal";
import { ContactForm } from "@/components/site/contact-form";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Tell me about your project. Digital marketing, SEO, design and WordPress work for growing brands.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <section className="bg-surface py-14 lg:py-[75px]">
      <div className="wrap grid gap-10 lg:grid-cols-2 lg:gap-[50px]">
        <Reveal>
          <Eyebrow>Get in touch</Eyebrow>
          <h1 className="mt-4 mb-4 text-[clamp(2.25rem,4.3vw,3rem)] leading-[1.1] tracking-[-0.045em]">
            Let&rsquo;s talk about
            <br />
            your next project.
          </h1>
          <p className="max-w-[480px] text-[17px] leading-[1.75] text-muted">
            Have a question or looking for the right support? Send me a message.
            I&rsquo;d love to hear what you&rsquo;re working on.
          </p>

          <div className="mt-6 grid gap-3">
            <a
              href={`mailto:${site.email}`}
              className="flex items-center gap-3.5 rounded-[15px] border border-line bg-white p-4 transition hover:border-violet-200 hover:shadow-soft"
            >
              <span
                aria-hidden="true"
                className="grid size-10 shrink-0 place-items-center rounded-[13px] bg-violet-50 text-lg text-violet-700"
              >
                ✉
              </span>
              <span>
                <small className="mb-0.5 block text-[13px] text-muted">
                  Email me
                </small>
                <b className="text-[15px] font-bold">{site.email}</b>
              </span>
            </a>

            <div className="flex items-center gap-3.5 rounded-[15px] border border-line bg-white p-4">
              <span
                aria-hidden="true"
                className="grid size-10 shrink-0 place-items-center rounded-[13px] bg-violet-50 text-lg text-violet-700"
              >
                ⏱
              </span>
              <span>
                <small className="mb-0.5 block text-[13px] text-muted">
                  Response time
                </small>
                <b className="text-[15px] font-bold">Within one business day</b>
              </span>
            </div>
          </div>
        </Reveal>

        <Reveal delay={80}>
          <ContactForm />
        </Reveal>
      </div>
    </section>
  );
}
