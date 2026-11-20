import { describe, expect, it } from "vitest";
import {
  DEFAULT_BANNED_KEYWORDS,
  SPAM_BLOCK_THRESHOLD,
  countLinks,
  isDisposableEmail,
  scoreSubmission,
  stripHtml,
} from "./spam";

describe("countLinks", () => {
  it("counts nothing in plain prose", () => {
    expect(countLinks("I need help with my website redesign.")).toBe(0);
  });

  it("counts a full URL", () => {
    expect(countLinks("See https://example.com/page for details")).toBe(1);
  });

  it("counts a www address", () => {
    expect(countLinks("visit www.example.com")).toBe(1);
  });

  it("counts a bare domain", () => {
    expect(countLinks("check example.com")).toBe(1);
  });

  it("does not count the same link twice", () => {
    expect(countLinks("https://example.com and https://example.com")).toBe(1);
  });

  it("counts distinct links separately", () => {
    expect(
      countLinks("https://a.com https://b.com https://c.com"),
    ).toBe(3);
  });

  it("does not treat ordinary sentences as domains", () => {
    expect(countLinks("I like this. That is fine. Ok.")).toBe(0);
  });
});

describe("isDisposableEmail", () => {
  it("flags a known disposable domain", () => {
    expect(isDisposableEmail("someone@mailinator.com")).toBe(true);
  });

  it("flags a subdomain of a disposable domain", () => {
    expect(isDisposableEmail("someone@inbox.mailinator.com")).toBe(true);
  });

  it("is case insensitive", () => {
    expect(isDisposableEmail("Someone@MailInator.COM")).toBe(true);
  });

  it("does not flag a normal domain", () => {
    expect(isDisposableEmail("someone@gmail.com")).toBe(false);
  });

  it("does not flag a domain that merely contains a disposable name", () => {
    expect(isDisposableEmail("someone@notmailinator.com")).toBe(false);
  });

  it("handles a malformed address", () => {
    expect(isDisposableEmail("not-an-email")).toBe(false);
  });
});

describe("stripHtml", () => {
  it("removes tags", () => {
    expect(stripHtml("<b>hello</b> world")).toBe("hello world");
  });

  it("removes script content tags", () => {
    expect(stripHtml("<script>alert(1)</script>hi")).toBe("alert(1) hi");
  });

  it("collapses whitespace left behind", () => {
    expect(stripHtml("a<br><br>b")).toBe("a b");
  });

  it("leaves plain text alone", () => {
    expect(stripHtml("just text")).toBe("just text");
  });
});

describe("scoreSubmission", () => {
  const clean = {
    name: "Rahim",
    email: "rahim@gmail.com",
    message:
      "Hello, I would like to discuss a redesign of our company website. We have a budget and a timeline already agreed.",
  };

  it("scores a normal enquiry at zero and does not block", () => {
    const verdict = scoreSubmission(clean);
    expect(verdict.score).toBe(0);
    expect(verdict.block).toBe(false);
    expect(verdict.signals).toHaveLength(0);
  });

  it("tolerates a single link in a normal message", () => {
    const verdict = scoreSubmission({
      ...clean,
      message: `${clean.message} Our site is https://example.com`,
    });
    expect(verdict.block).toBe(false);
  });

  it("scores multiple links", () => {
    const verdict = scoreSubmission({
      ...clean,
      message: "https://a.com https://b.com https://c.com",
    });
    expect(verdict.signals.some((s) => s.code === "links")).toBe(true);
    expect(verdict.score).toBeGreaterThan(0);
  });

  it("blocks a link-flooded short message", () => {
    const verdict = scoreSubmission({
      ...clean,
      message:
        "https://a.com https://b.com https://c.com https://d.com https://e.com",
    });
    expect(verdict.block).toBe(true);
  });

  it("scores banned keywords", () => {
    const verdict = scoreSubmission({
      ...clean,
      message: "Best casino and viagra deals for you my friend, very good price",
    });
    expect(verdict.signals.some((s) => s.code === "keywords")).toBe(true);
  });

  it("blocks a message stuffed with banned keywords", () => {
    const verdict = scoreSubmission({
      ...clean,
      message:
        "casino viagra cialis loan offer work from home earn click here to claim",
    });
    expect(verdict.block).toBe(true);
  });

  it("uses a custom keyword list when given one", () => {
    const verdict = scoreSubmission({
      ...clean,
      message: "I want to discuss our new website project in detail please",
      bannedKeywords: ["website"],
    });
    expect(verdict.signals.some((s) => s.code === "keywords")).toBe(true);
  });

  it("ignores an empty keyword entry", () => {
    const verdict = scoreSubmission({
      ...clean,
      bannedKeywords: ["", "   "],
    });
    expect(verdict.signals.some((s) => s.code === "keywords")).toBe(false);
  });

  it("scores a disposable email", () => {
    const verdict = scoreSubmission({
      ...clean,
      email: "spammer@mailinator.com",
    });
    expect(verdict.signals.some((s) => s.code === "disposable_email")).toBe(true);
  });

  it("scores a repeated message", () => {
    const verdict = scoreSubmission({ ...clean, repeatedMessage: true });
    expect(verdict.signals.some((s) => s.code === "repeated_message")).toBe(true);
  });

  it("blocks a repeated message from a disposable address", () => {
    const verdict = scoreSubmission({
      ...clean,
      email: "spammer@mailinator.com",
      repeatedMessage: true,
    });
    expect(verdict.block).toBe(true);
  });

  it("scores shouting", () => {
    const verdict = scoreSubmission({
      ...clean,
      message: "THIS IS A VERY IMPORTANT MESSAGE ABOUT YOUR WEBSITE RIGHT NOW",
    });
    expect(verdict.signals.some((s) => s.code === "shouting")).toBe(true);
  });

  it("does not score shouting on a short message", () => {
    const verdict = scoreSubmission({ ...clean, message: "HELLO THERE" });
    expect(verdict.signals.some((s) => s.code === "shouting")).toBe(false);
  });

  it("blocks the combination of weak signals", () => {
    const verdict = scoreSubmission({
      name: "x",
      email: "x@mailinator.com",
      message: "https://a.com https://b.com casino viagra",
      repeatedMessage: true,
    });
    expect(verdict.block).toBe(true);
    expect(verdict.score).toBeGreaterThanOrEqual(SPAM_BLOCK_THRESHOLD);
  });

  it("never returns a negative score", () => {
    expect(scoreSubmission(clean).score).toBeGreaterThanOrEqual(0);
  });

  it("ships a non-empty default keyword list", () => {
    expect(DEFAULT_BANNED_KEYWORDS.length).toBeGreaterThan(5);
  });
});
