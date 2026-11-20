import type { Metadata } from "next";
import Link from "next/link";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Reveal } from "@/components/ui/reveal";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of Use",
  description:
    "Terms governing use of the Junaed Hossain website, its content and its contact form.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <section className="py-14 lg:py-20">
      <div className="wrap max-w-[760px]">
        <Reveal>
          <Eyebrow>Legal</Eyebrow>
          <h1 className="mt-4 mb-3 text-[clamp(2rem,4.5vw,3rem)] leading-[1.1] tracking-[-0.045em]">
            Terms of Use
          </h1>
          <p className="mb-8 text-sm text-muted">
            Last updated: 20 November 2026
          </p>

          <div className="prose-site">
            <p>
              These terms apply to your use of {site.url}. By using the site you
              accept them. If you do not, please do not use the site.
            </p>

            <h2>Content and ownership</h2>
            <p>
              All text, images, designs and code on this site are owned by{" "}
              {site.name} unless stated otherwise. You may read, link to and quote
              short excerpts with attribution. You may not republish substantial
              portions, resell the content, or present it as your own.
            </p>

            <h2>Portfolio and illustrative content</h2>
            <p>
              Some portfolio entries are illustrative placeholders used to
              demonstrate layout and case-study structure. Where a project is a
              placeholder, this is stated on the page. Real client work is
              published only with permission.
            </p>

            <h2>No professional advice</h2>
            <p>
              Articles and notes on this site describe general experience with
              marketing, search and web development. They are not professional
              advice for your specific situation, and no outcome is guaranteed.
              Results described in case studies are specific to those projects.
            </p>

            <h2>Acceptable use</h2>
            <ul>
              <li>Do not attempt to gain unauthorised access to any part of the site.</li>
              <li>Do not submit spam, malware, or automated bulk enquiries.</li>
              <li>Do not scrape the site in a way that degrades service for others.</li>
              <li>Do not use the contact form to send unlawful or abusive content.</li>
            </ul>

            <h2>Enquiries and quotations</h2>
            <p>
              Sending an enquiry does not create a contract. Any work is governed
              by a separate written agreement covering scope, timeline, payment
              and ownership of deliverables.
            </p>

            <h2>Availability</h2>
            <p>
              The site is provided as-is. It may be unavailable during maintenance
              or because of factors outside reasonable control. No warranty of
              uninterrupted availability is given.
            </p>

            <h2>Limitation of liability</h2>
            <p>
              To the extent permitted by law, {site.name} is not liable for
              indirect or consequential loss arising from use of this site or
              reliance on its content.
            </p>

            <h2>Governing law</h2>
            <p>
              These terms are governed by the laws of Bangladesh, without regard
              to conflict-of-law rules.
            </p>

            <h2>Contact</h2>
            <p>
              Questions about these terms:{" "}
              <a href={`mailto:${site.email}`}>{site.email}</a>. See also the{" "}
              <Link href="/privacy-policy">Privacy Policy</Link>.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
