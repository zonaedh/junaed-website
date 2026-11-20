import Link from "next/link";
import type { Service } from "@/lib/content";

export function ServiceCard({ service }: { service: Service }) {
  return (
    <article className="group relative flex min-h-[235px] flex-col rounded-[22px] border border-line bg-white p-[25px_22px] transition duration-200 ease-out focus-within:border-violet-300 hover:-translate-y-[5px] hover:border-violet-200 hover:shadow-soft">
      <div
        aria-hidden="true"
        className="mb-[22px] grid size-[46px] place-items-center rounded-[15px] bg-violet-50 text-[21px] text-violet-700"
      >
        {service.icon}
      </div>
      <h3 className="mb-2.5 text-[20px] leading-[1.25] tracking-[-0.03em]">
        {service.title}
      </h3>
      <p className="mb-[18px] text-[15px] leading-[1.75] text-muted">
        {service.summary}
      </p>
      <Link
        href={`/services/${service.slug}`}
        className="mt-auto inline-flex items-center gap-1.5 text-sm font-bold text-violet-700 after:absolute after:inset-0 after:content-[''] hover:text-violet-900"
      >
        <span>Learn more</span>
        <span
          aria-hidden="true"
          className="transition-transform duration-200 group-hover:translate-x-1"
        >
          →
        </span>
      </Link>
    </article>
  );
}
