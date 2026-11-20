import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/eyebrow";

export default function NotFound() {
  return (
    <section className="py-20 lg:py-28">
      <div className="wrap max-w-[620px] text-center">
        <Eyebrow className="justify-center">404</Eyebrow>
        <h1 className="mt-5 mb-4 text-[clamp(2rem,4.5vw,3rem)] leading-[1.1] tracking-[-0.045em]">
          That page doesn&rsquo;t exist.
        </h1>
        <p className="mx-auto max-w-[440px] text-[17px] leading-[1.75] text-muted">
          The link may be out of date, or the page may have moved. Here is where
          most people are heading.
        </p>

        <ul className="mx-auto mt-8 flex max-w-[420px] flex-col gap-2 text-left">
          {[
            { href: "/", label: "Home" },
            { href: "/services", label: "Services" },
            { href: "/portfolio", label: "Portfolio" },
            { href: "/blog", label: "Blog" },
            { href: "/contact", label: "Contact" },
          ].map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="flex min-h-11 items-center justify-between rounded-xl border border-line px-4 text-[15px] font-semibold transition hover:border-violet-200 hover:bg-violet-50"
              >
                {item.label}
                <span aria-hidden="true" className="text-violet-600">
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-8">
          <ButtonLink href="/contact">Get in touch</ButtonLink>
        </div>
      </div>
    </section>
  );
}
