import { describe, expect, it } from "vitest";
import {
  absoluteUrl,
  applyTitleTemplate,
  breadcrumbList,
  canonicalPath,
  descriptionLengthState,
  robotsFromNoindex,
  scoreContent,
  serializeJsonLd,
  titleLengthState,
  truncateAtWord,
} from "./core";

describe("applyTitleTemplate", () => {
  it("substitutes %s", () => {
    expect(applyTitleTemplate("About", "%s | Junaed Hossain")).toBe(
      "About | Junaed Hossain",
    );
  });

  it("appends the page title when the template has no %s", () => {
    // A title that silently vanishes is worse than an ugly one.
    expect(applyTitleTemplate("About", "Junaed Hossain")).toBe(
      "About | Junaed Hossain",
    );
  });

  it("returns the page title when the template is empty", () => {
    expect(applyTitleTemplate("About", "   ")).toBe("About");
  });

  it("replaces every occurrence of %s", () => {
    expect(applyTitleTemplate("SEO", "%s · %s")).toBe("SEO · SEO");
  });
});

describe("truncateAtWord", () => {
  it("leaves short text alone", () => {
    expect(truncateAtWord("short text", 50)).toBe("short text");
  });

  it("cuts on a word boundary and adds an ellipsis", () => {
    const result = truncateAtWord("the quick brown fox jumps over the dog", 20);
    expect(result.endsWith("…")).toBe(true);
    expect(result.length).toBeLessThanOrEqual(21);
    expect(result).not.toContain("jumps over the do…");
  });

  it("collapses whitespace", () => {
    expect(truncateAtWord("a   b\n\nc", 50)).toBe("a b c");
  });
});

describe("length states", () => {
  it("classifies titles", () => {
    expect(titleLengthState("")).toBe("empty");
    expect(titleLengthState("Short")).toBe("short");
    expect(titleLengthState("A perfectly reasonable page title here")).toBe("good");
    expect(titleLengthState("x".repeat(61))).toBe("long");
  });

  it("classifies descriptions", () => {
    expect(descriptionLengthState("")).toBe("empty");
    expect(descriptionLengthState("too short")).toBe("thin");
    expect(descriptionLengthState("x".repeat(120))).toBe("good");
    expect(descriptionLengthState("x".repeat(161))).toBe("long");
  });
});

describe("canonicalPath", () => {
  it("strips the trailing slash", () => {
    expect(canonicalPath("/blog/")).toBe("/blog");
  });

  it("keeps the root slash", () => {
    expect(canonicalPath("/")).toBe("/");
  });

  it("adds a leading slash", () => {
    expect(canonicalPath("blog/post")).toBe("/blog/post");
  });

  it("reduces an absolute URL to its path", () => {
    expect(canonicalPath("https://junaedhossain.com/blog/hello/")).toBe(
      "/blog/hello",
    );
  });

  it("drops tracking parameters but keeps the rest", () => {
    expect(canonicalPath("/blog?utm_source=x&page=2&fbclid=y")).toBe("/blog?page=2");
  });

  it("drops the query entirely when only tracking params remain", () => {
    expect(canonicalPath("/blog?utm_source=x")).toBe("/blog");
  });

  it("drops the hash", () => {
    expect(canonicalPath("/blog#section")).toBe("/blog");
  });

  it("preserves path case", () => {
    expect(canonicalPath("/Blog/Post")).toBe("/Blog/Post");
  });
});

describe("absoluteUrl", () => {
  it("joins without a double slash", () => {
    expect(absoluteUrl("https://example.com/", "/blog")).toBe(
      "https://example.com/blog",
    );
  });

  it("adds a missing leading slash", () => {
    expect(absoluteUrl("https://example.com", "blog")).toBe(
      "https://example.com/blog",
    );
  });
});

describe("robotsFromNoindex", () => {
  it("indexes by default", () => {
    expect(robotsFromNoindex(false)).toEqual({ index: true, follow: true });
  });

  it("blocks both when noindex is set", () => {
    expect(robotsFromNoindex(true)).toEqual({ index: false, follow: false });
  });
});

describe("breadcrumbList", () => {
  it("numbers positions from one", () => {
    const node = breadcrumbList(
      [
        { name: "Home", path: "/" },
        { name: "Blog", path: "/blog" },
      ],
      "https://example.com",
    );
    expect(node.itemListElement[0].position).toBe(1);
    expect(node.itemListElement[1].position).toBe(2);
    expect(node.itemListElement[1].item).toBe("https://example.com/blog");
  });
});

describe("serializeJsonLd", () => {
  it("escapes < so a closing script tag cannot break out", () => {
    const serialised = serializeJsonLd({ name: "</script><script>alert(1)" });
    expect(serialised).not.toContain("</script>");
    expect(serialised).toContain("\\u003c");
  });

  it("still parses back to the original value", () => {
    const original = { name: "a </script> b", n: 1 };
    expect(JSON.parse(serializeJsonLd(original))).toEqual(original);
  });
});

describe("scoreContent", () => {
  const strong = {
    focusKeyword: "technical seo",
    title: "Technical SEO for WordPress sites",
    h1: "Technical SEO that actually moves rankings",
    slug: "technical-seo-wordpress",
    metaDescription:
      "A practical walkthrough of technical SEO for WordPress: crawling, indexing, core web vitals and the fixes that move rankings.",
    bodyText: `Technical seo matters. ${"word ".repeat(320)}`,
    imageAlts: ["A screenshot of the crawl report"],
    internalLinks: 2,
  };

  it("scores a well-optimised piece highly", () => {
    const result = scoreContent(strong);
    expect(result.score).toBe(100);
    expect(result.passed).toBe(result.total);
  });

  it("fails the keyword checks when no keyword is set", () => {
    const result = scoreContent({ ...strong, focusKeyword: "" });
    expect(result.score).toBeLessThan(100);
    const keywordItems = result.items.filter((item) => item.id.startsWith("keyword-"));
    expect(keywordItems.every((item) => !item.passed)).toBe(true);
  });

  it("fails the alt check when an image has empty alt text", () => {
    const result = scoreContent({ ...strong, imageAlts: ["good alt", "  "] });
    const alt = result.items.find((item) => item.id === "image-alts");
    expect(alt?.passed).toBe(false);
  });

  it("fails the alt check when there are no images", () => {
    const result = scoreContent({ ...strong, imageAlts: [] });
    expect(result.items.find((item) => item.id === "image-alts")?.passed).toBe(false);
  });

  it("fails the word count check on thin content", () => {
    const result = scoreContent({ ...strong, bodyText: "too short a body" });
    expect(result.items.find((item) => item.id === "word-count")?.passed).toBe(false);
  });

  it("fails the internal link check with none", () => {
    const result = scoreContent({ ...strong, internalLinks: 0 });
    expect(result.items.find((item) => item.id === "internal-links")?.passed).toBe(false);
  });

  it("never returns a score outside 0..100", () => {
    const empty = scoreContent({
      title: "",
      slug: "",
      metaDescription: "",
      bodyText: "",
      imageAlts: [],
      internalLinks: 0,
    });
    expect(empty.score).toBeGreaterThanOrEqual(0);
    expect(empty.score).toBeLessThanOrEqual(100);
  });

  it("matches the keyword in the slug with hyphens", () => {
    const result = scoreContent({
      ...strong,
      focusKeyword: "technical seo",
      slug: "technical-seo",
    });
    expect(result.items.find((item) => item.id === "keyword-slug")?.passed).toBe(true);
  });
});
