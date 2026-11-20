import type { ReactNode } from "react";
import { Eyebrow } from "./eyebrow";

/**
 * Section heading block: eyebrow + h2 + supporting paragraph.
 * `highlight` renders the trailing words in violet, matching the original.
 */
export function SectionHead({
  eyebrow,
  title,
  highlight,
  children,
  align = "left",
  tone = "dark",
  as: Heading = "h2",
  className = "",
}: {
  eyebrow?: string;
  title: ReactNode;
  highlight?: ReactNode;
  children?: ReactNode;
  align?: "left" | "center";
  tone?: "dark" | "light";
  as?: "h2" | "h3";
  className?: string;
}) {
  const alignCls = align === "center" ? "text-center mx-auto" : "";
  const titleColor = tone === "light" ? "text-white" : "text-ink";
  const bodyColor = tone === "light" ? "text-violet-200" : "text-muted";
  const highlightColor = tone === "light" ? "text-violet-300" : "text-violet-600";

  return (
    <div className={`max-w-[650px] ${alignCls} ${className}`}>
      {eyebrow ? <Eyebrow tone={tone}>{eyebrow}</Eyebrow> : null}
      <Heading
        className={`mt-3.5 mb-4 text-[clamp(2.25rem,4.2vw,3.25rem)] leading-[1.12] tracking-[-0.045em] ${titleColor}`}
      >
        {title}
        {highlight ? (
          <>
            {" "}
            <span className={highlightColor}>{highlight}</span>
          </>
        ) : null}
      </Heading>
      {children ? (
        <p className={`text-[17px] leading-[1.75] ${bodyColor}`}>{children}</p>
      ) : null}
    </div>
  );
}
