"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Fades content up when it scrolls into view.
 *
 * The `js-reveal` class (which starts at opacity 0) is present in the server
 * HTML, so there is no flash of visible-then-hidden content. A <noscript>
 * rule in the site layout forces it visible when JS is off, and the CSS
 * itself is wrapped in `prefers-reduced-motion: no-preference`.
 *
 * The effect only touches the DOM directly — it never calls setState, so it
 * cannot trigger cascading renders.
 */
export function Reveal({
  children,
  delay = 0,
  className = "",
  as: Tag = "div",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "section" | "li" | "article" | "header";
}) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (typeof IntersectionObserver === "undefined") {
      node.classList.add("is-visible");
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref as React.Ref<never>}
      className={`js-reveal ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}
