import { describe, expect, it } from "vitest";
import { hasRole, type RoleName } from "./role-hierarchy";

/**
 * RBAC is the security boundary for every admin action. These tests pin the
 * hierarchy so a future refactor cannot quietly widen access.
 *
 * They import role-hierarchy.ts (pure) rather than rbac.ts, because rbac.ts
 * pulls in the database client and redirect helpers.
 */
describe("hasRole", () => {
  it("admits the exact role", () => {
    expect(hasRole("editor", "editor")).toBe(true);
    expect(hasRole("admin", "admin")).toBe(true);
    expect(hasRole("owner", "owner")).toBe(true);
    expect(hasRole("support", "support")).toBe(true);
  });

  it("admits higher roles", () => {
    expect(hasRole("owner", "admin")).toBe(true);
    expect(hasRole("owner", "editor")).toBe(true);
    expect(hasRole("admin", "editor")).toBe(true);
    expect(hasRole("editor", "support")).toBe(true);
  });

  it("refuses lower roles", () => {
    expect(hasRole("support", "editor")).toBe(false);
    expect(hasRole("support", "admin")).toBe(false);
    expect(hasRole("editor", "admin")).toBe(false);
    expect(hasRole("admin", "owner")).toBe(false);
    expect(hasRole("editor", "owner")).toBe(false);
  });

  it("keeps support out of every content role", () => {
    const contentRoles: RoleName[] = ["editor", "admin", "owner"];
    for (const role of contentRoles) {
      expect(hasRole("support", role)).toBe(false);
    }
  });

  it("gives owner every role", () => {
    const all: RoleName[] = ["support", "editor", "admin", "owner"];
    for (const role of all) {
      expect(hasRole("owner", role)).toBe(true);
    }
  });
});
