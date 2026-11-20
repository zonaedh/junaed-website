import { describe, expect, it } from "vitest";
import { contactSchema } from "./contact";

const valid = {
  name: "Junaed Hossain",
  email: "junaed@example.com",
  service: "SEO",
  message: "I need help with technical SEO on a WordPress site.",
  website: "",
  startedAt: 1_700_000_000_000,
};

describe("contactSchema", () => {
  it("accepts a well-formed submission", () => {
    const result = contactSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("lowercases and trims the email", () => {
    const result = contactSchema.safeParse({
      ...valid,
      email: "  JUNAED@Example.COM  ",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBe("junaed@example.com");
  });

  it("rejects a name that is too short", () => {
    const result = contactSchema.safeParse({ ...valid, name: "J" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid email", () => {
    const result = contactSchema.safeParse({ ...valid, email: "not-an-email" });
    expect(result.success).toBe(false);
  });

  it("rejects a message under 20 characters", () => {
    const result = contactSchema.safeParse({ ...valid, message: "too short" });
    expect(result.success).toBe(false);
  });

  it("rejects a message over 5000 characters", () => {
    const result = contactSchema.safeParse({
      ...valid,
      message: "a".repeat(5001),
    });
    expect(result.success).toBe(false);
  });

  it("rejects a filled honeypot", () => {
    const result = contactSchema.safeParse({ ...valid, website: "spam" });
    expect(result.success).toBe(false);
  });

  it("turns an empty service into undefined", () => {
    const result = contactSchema.safeParse({ ...valid, service: "" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.service).toBeUndefined();
  });

  it("strips HTML tags from the message body is NOT done here (Phase 5 sanitises)", () => {
    // Documents current behaviour: the schema stores text as-is and escaping
    // happens at render. Kept explicit so nobody assumes sanitisation exists.
    const result = contactSchema.safeParse({
      ...valid,
      message: "<script>alert(1)</script> hello there friend",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.message).toContain("<script>");
  });
});
