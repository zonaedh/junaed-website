import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

type Variant = "primary" | "light" | "ghost";
type Size = "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2.5 rounded-[13px] font-bold transition-[background-color,color,transform,box-shadow] duration-200 ease-out cursor-pointer select-none disabled:pointer-events-none disabled:opacity-55";

const variants: Record<Variant, string> = {
  primary:
    "bg-violet-950 text-white hover:bg-violet-700 hover:-translate-y-0.5 active:translate-y-0",
  light:
    "bg-white text-violet-950 border border-line hover:bg-violet-50 hover:-translate-y-0.5 active:translate-y-0",
  ghost:
    "bg-transparent text-violet-700 hover:bg-violet-50 hover:text-violet-900",
};

const sizes: Record<Size, string> = {
  md: "px-5 py-3.5 text-[15px] min-h-11",
  lg: "px-6 py-4 text-base min-h-12",
};

function classes(variant: Variant, size: Size, className?: string) {
  return [base, variants[variant], sizes[size], className]
    .filter(Boolean)
    .join(" ");
}

type ButtonProps = {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
} & ComponentPropsWithoutRef<"button">;

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button type={type} className={classes(variant, size, className)} {...rest}>
      {children}
    </button>
  );
}

type ButtonLinkProps = {
  href: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
  external?: boolean;
} & Omit<ComponentPropsWithoutRef<"a">, "href" | "className" | "children">;

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
  external = false,
  ...rest
}: ButtonLinkProps) {
  const cls = classes(variant, size, className);

  if (external) {
    return (
      <a
        href={href}
        className={cls}
        target="_blank"
        rel="noopener noreferrer"
        {...rest}
      >
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={cls} {...rest}>
      {children}
    </Link>
  );
}

/** The ↗ arrow used on primary CTAs in the original design. */
export function ArrowUpRight({ className = "" }: { className?: string }) {
  return (
    <span aria-hidden="true" className={className}>
      ↗
    </span>
  );
}
