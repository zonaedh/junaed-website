import type { Metadata } from "next";
import Link from "next/link";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Reveal } from "@/components/ui/reveal";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Junaed Hossain collects, uses and protects personal information submitted through this website.",
  alternates: { canonical: "/privacy-policy" },
};

export default function PrivacyPolicyPage() {
  return (
    <section className="py-14 lg:py-20">
      <div className="wrap max-w-[760px]">
        <Reveal>
          <Eyebrow>Legal</Eyebrow>
          <h1 className="mt-4 mb-3 text-[clamp(2rem,4.5vw,3rem)] leading-[1.1] tracking-[-0.045em]">
            Privacy Policy
          </h1>
          <p className="mb-8 text-sm text-muted">
            Last updated: 20 November 2026
          </p>

          <div className="prose-site">
            <p>
              This policy explains what information {site.name} collects through{" "}
              {site.url}, why it is collected, and what happens to it. It is
              written to be read, not to be survived.
            </p>

            <h2>What is collected</h2>
            <p>
              If you use the contact form, the site collects the name, email
              address, optional service selection and message you submit. That is
              the only personal information collected through this site.
            </p>
            <p>
              The site also records anonymous page-view data: the page visited,
              the referring source, device type, browser, and a coarse country
              estimate. IP addresses are hashed with a rotating salt and are not
              stored in raw form.
            </p>

            <h2>Why it is collected</h2>
            <ul>
              <li>To reply to enquiries you send through the contact form.</li>
              <li>To understand which pages are useful and which are not.</li>
              <li>To detect and block automated spam submissions.</li>
            </ul>

            <h2>What is not done with it</h2>
            <p>
              Your information is not sold, rented, or shared with advertising
              networks. Contact form submissions are not added to a mailing list
              unless you explicitly ask to be.
            </p>

            <h2>Third-party services</h2>
            <p>
              The site uses a small number of service providers to operate:
              hosting, database, email delivery, and file storage. These providers
              process data on instruction and are bound by their own data
              processing terms. Analytics and tracking scripts are loaded only
              after you consent where consent is required.
            </p>

            <h2>How long it is kept</h2>
            <p>
              Contact enquiries are kept for as long as needed to handle the
              conversation and any resulting work, then archived or deleted.
              Anonymous analytics data is retained for a maximum of twelve months.
            </p>

            <h2>Your rights</h2>
            <p>
              You can ask what personal information is held about you, request a
              copy, ask for corrections, or ask for it to be deleted. Write to{" "}
              <a href={`mailto:${site.email}`}>{site.email}</a> and the request
              will be handled within a reasonable period.
            </p>

            <h2>Cookies</h2>
            <p>
              Essential cookies are used to keep the site working and, on the
              admin panel, to keep a signed-in session secure. Non-essential
              cookies for analytics or advertising are set only after consent.
            </p>

            <h2>Changes</h2>
            <p>
              If this policy changes materially, the &ldquo;last updated&rdquo;
              date above will change and the new version will apply from that
              date.
            </p>

            <h2>Contact</h2>
            <p>
              Questions about this policy:{" "}
              <a href={`mailto:${site.email}`}>{site.email}</a>. See also the{" "}
              <Link href="/terms">Terms of Use</Link>.
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
