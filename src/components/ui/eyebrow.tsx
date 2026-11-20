import type { ReactNode } from "react";

/**
 * Small uppercase label with the leading rule, as in the original design.
 * `tone="light"` is for use on the dark violet About section.
 */
export function Eyebrow({
  children,
  tone = "dark",
  className = "",
}: {
  children: ReactNode;
  tone?: "dark" | "light";
  className?: string;
}) {
  const color = tone === "light" ? "text-violet-300" : "text-violet-700";
  const rule = tone === "light" ? "bg-violet-400" : "bg-violet-500";

  return (
    <span
      className={`inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.11em] ${color} ${className}`}
    >
      <span aria-hidden="true" className={`h-0.5 w-[18px] ${rule}`} />
      {children}
    </span>
  );
}
