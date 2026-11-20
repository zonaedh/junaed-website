import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Reveal } from "@/components/ui/reveal";

export const metadata: Metadata = {
  title: "Message received",
  description: "Your message has been received.",
  robots: { index: false, follow: false },
};

export default function ThankYouPage() {
  return (
    <section className="py-20 lg:py-28">
      <div className="wrap max-w-[620px] text-center">
        <Reveal>
          <Eyebrow className="justify-center">Thank you</Eyebrow>
          <h1 className="mt-5 mb-4 text-[clamp(2rem,4.5vw,3rem)] leading-[1.1] tracking-[-0.045em]">
            Message received.
          </h1>
          <p className="mx-auto max-w-[480px] text-[17px] leading-[1.75] text-muted">
            Thanks for getting in touch. I read every message personally and
            usually reply within one business day.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/portfolio">See my work</ButtonLink>
            <ButtonLink href="/" variant="light">
              Back to home
            </ButtonLink>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
