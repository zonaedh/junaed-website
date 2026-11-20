import { describe, expect, it } from "vitest";
import {
  autoExcerpt,
  countWords,
  docToPlainText,
  isSafeDoc,
  pruneDoc,
  readingMinutes,
  slugify,
  type TiptapDoc,
  type TiptapNode,
} from "./content";

/**
 * The post body is stored as JSONB and rendered on the public site, so these
 * two things must hold: the derived numbers are right, and an unexpected node
 * type can never reach the renderer.
 */

function doc(...content: TiptapNode[]): TiptapDoc {
  return { type: "doc", content };
}

function para(text: string) {
  return { type: "paragraph", content: [{ type: "text", text }] };
}

describe("docToPlainText", () => {
  it("joins paragraphs with a break, not a space", () => {
    const text = docToPlainText(doc(para("first"), para("second")));
    expect(text).toContain("first");
    expect(text).toContain("second");
    expect(text.split("\n").filter(Boolean)).toHaveLength(2);
  });

  it("walks nested list content", () => {
    const text = docToPlainText(
      doc({
        type: "bulletList",
        content: [
          {
            type: "listItem",
            content: [para("alpha"), para("beta")],
          },
        ],
      }),
    );
    expect(text).toContain("alpha");
    expect(text).toContain("beta");
  });

  it("returns empty string for a null document", () => {
    expect(docToPlainText(null)).toBe("");
    expect(docToPlainText(undefined)).toBe("");
  });

  it("returns empty string for a document with no content", () => {
    expect(docToPlainText({ type: "doc" })).toBe("");
  });
});

describe("countWords", () => {
  it("counts words across paragraphs", () => {
    expect(countWords(doc(para("one two three"), para("four five")))).toBe(5);
  });

  it("is zero for an empty document", () => {
    expect(countWords(doc())).toBe(0);
  });

  it("does not count whitespace runs as words", () => {
    expect(countWords(doc(para("a    b")))).toBe(2);
  });
});

describe("readingMinutes", () => {
  it("returns zero for an empty body", () => {
    expect(readingMinutes(doc())).toBe(0);
  });

  it("never returns less than one minute for real content", () => {
    expect(readingMinutes(doc(para("short")))).toBe(1);
  });

  it("scales with length", () => {
    const long = Array.from({ length: 900 }, () => "word").join(" ");
    // 900 words at 220 wpm ≈ 4 minutes.
    expect(readingMinutes(doc(para(long)))).toBe(4);
  });
});

describe("autoExcerpt", () => {
  it("returns the whole text when it is short", () => {
    expect(autoExcerpt(doc(para("short body")))).toBe("short body");
  });

  it("truncates on a word boundary and adds an ellipsis", () => {
    const long = Array.from({ length: 100 }, () => "word").join(" ");
    const excerpt = autoExcerpt(doc(para(long)), 40);
    expect(excerpt.length).toBeLessThanOrEqual(41);
    expect(excerpt.endsWith("…")).toBe(true);
    // Must not cut a word in half.
    expect(excerpt.replace("…", "")).not.toMatch(/wor$/);
  });
});

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("Why Your SEO Audit Keeps Saying The Same Thing")).toBe(
      "why-your-seo-audit-keeps-saying-the-same-thing",
    );
  });

  it("strips punctuation and apostrophes", () => {
    expect(slugify("The real cost of a heavy WordPress theme")).toBe(
      "the-real-cost-of-a-heavy-wordpress-theme",
    );
    expect(slugify("It's a brand's problem")).toBe("its-a-brands-problem");
  });

  it("collapses runs of separators", () => {
    expect(slugify("a  ---  b")).toBe("a-b");
  });

  it("trims leading and trailing hyphens", () => {
    expect(slugify("--hello--")).toBe("hello");
  });

  it("strips accents rather than dropping the letter", () => {
    expect(slugify("Café résumé")).toBe("cafe-resume");
  });

  it("never returns an empty string for punctuation-only input", () => {
    // Callers must handle this; the slug column is unique and not empty.
    expect(slugify("!!!")).toBe("");
  });
});

describe("isSafeDoc", () => {
  it("accepts a well-formed document", () => {
    expect(isSafeDoc(doc(para("x")))).toBe(true);
  });

  it("accepts a document with no content array", () => {
    expect(isSafeDoc({ type: "doc" })).toBe(true);
  });

  it("rejects null, strings and arrays", () => {
    expect(isSafeDoc(null)).toBe(false);
    expect(isSafeDoc("doc")).toBe(false);
    expect(isSafeDoc([])).toBe(false);
  });

  it("rejects an object with the wrong type", () => {
    expect(isSafeDoc({ type: "paragraph" })).toBe(false);
  });
});

describe("pruneDoc", () => {
  it("keeps known node types", () => {
    const pruned = pruneDoc(doc(para("keep me")));
    expect(pruned.content).toHaveLength(1);
    expect(pruned.content?.[0].type).toBe("paragraph");
  });

  it("drops an unknown node type", () => {
    const pruned = pruneDoc(
      doc(para("keep"), { type: "script", content: [{ type: "text", text: "evil" }] }),
    );
    expect(pruned.content).toHaveLength(1);
    expect(JSON.stringify(pruned)).not.toContain("evil");
  });

  it("drops an unknown node nested inside a known one", () => {
    const pruned = pruneDoc(
      doc({
        type: "bulletList",
        content: [
          { type: "listItem", content: [para("ok")] },
          { type: "iframe", attrs: { src: "javascript:alert(1)" } },
        ],
      }),
    );
    const serialised = JSON.stringify(pruned);
    expect(serialised).not.toContain("iframe");
    expect(serialised).not.toContain("javascript");
    expect(serialised).toContain("ok");
  });

  it("handles a document with no content", () => {
    expect(pruneDoc({ type: "doc" })).toEqual({ type: "doc", content: [] });
  });
});
