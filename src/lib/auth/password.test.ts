import { describe, expect, it } from "vitest";
import { validatePasswordStrength, PASSWORD_MIN_LENGTH } from "./password";

describe("password policy", () => {
  it("requires at least 12 characters", () => {
    expect(PASSWORD_MIN_LENGTH).toBe(12);
    expect(validatePasswordStrength("short")).toMatch(/at least 12/);
    expect(validatePasswordStrength("a".repeat(11))).toMatch(/at least 12/);
  });

  it("accepts a long passphrase", () => {
    expect(validatePasswordStrength("correct horse battery staple")).toBeNull();
  });

  it("rejects passwords containing common words", () => {
    expect(validatePasswordStrength("myPassword1234")).toMatch(/too common/);
    expect(validatePasswordStrength("QWERTYuiop123")).toMatch(/too common/);
    expect(validatePasswordStrength("admin-admin-admin")).toMatch(/too common/);
  });

  it("rejects absurdly long input", () => {
    expect(validatePasswordStrength("a".repeat(201))).toMatch(/under 200/);
  });
});
