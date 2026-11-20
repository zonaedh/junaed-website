import { describe, expect, it } from "vitest";
import { loginSchema } from "./auth";

/**
 * These pin a bug that shipped once: FormData.get() returns null for an absent
 * field, and Zod's .optional() rejects null. Every first-step login failed
 * validation and surfaced as "Email or password is incorrect."
 */
describe("loginSchema", () => {
  const base = { email: "Owner@JunaedHossain.com", password: "a-long-password" };

  it("accepts a login with no 2FA field at all (null from FormData)", () => {
    const result = loginSchema.safeParse({ ...base, totp: null });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.totp).toBeUndefined();
      expect(result.data.email).toBe("owner@junaedhossain.com");
    }
  });

  it("accepts an omitted 2FA field (undefined)", () => {
    const result = loginSchema.safeParse(base);
    expect(result.success).toBe(true);
  });

  it("treats an empty 2FA field as absent", () => {
    const result = loginSchema.safeParse({ ...base, totp: "" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.totp).toBeUndefined();
  });

  it("keeps a real 2FA code", () => {
    const result = loginSchema.safeParse({ ...base, totp: " 123456 " });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.totp).toBe("123456");
  });

  it("still rejects a missing email or password", () => {
    expect(loginSchema.safeParse({ email: "", password: "x" }).success).toBe(false);
    expect(loginSchema.safeParse({ email: "a@b.co", password: "" }).success).toBe(false);
  });
});
