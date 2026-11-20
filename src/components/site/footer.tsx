import Link from "next/link";
import { footerNav, legalNav, site } from "@/lib/site";

export function Footer() {
  // Rendered on the server on purpose: no JS needed for the copyright year.
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-line py-7">
      <div className="wrap flex flex-col items-start gap-5 text-sm text-muted md:flex-row md:items-center md:justify-between">
        <Link
          href="/"
          className="flex items-center gap-[11px] font-display text-[17px] font-extrabold tracking-[-0.04em] text-ink"
        >
          <span
            aria-hidden="true"
            className="grid size-[38px] place-items-center rounded-[13px] bg-linear-145 from-violet-500 to-violet-950 text-[17px] font-extrabold text-white"
          >
            {site.shortName.charAt(0)}
          </span>
          <span>{site.name}</span>
        </Link>

        <p className="order-last md:order-none">
          © {year} {site.name}. Crafted with care.
        </p>

        <nav aria-label="Footer navigation">
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            {footerNav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="transition-colors hover:text-violet-600"
                >
                  {item.label}
                </Link>
              </li>
            ))}
            {legalNav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="transition-colors hover:text-violet-600"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
