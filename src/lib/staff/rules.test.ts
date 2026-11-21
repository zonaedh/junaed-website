import { describe, expect, it } from "vitest";
import {
  assignableRoles,
  canAssignRole,
  canManageStaff,
  describeRoleChange,
  wouldRemoveLastOwner,
} from "./rules";

/**
 * Staff rule tests (MVP.md §8.4).
 *
 * The cases worth testing are the ones that would be a disaster in production:
 * an admin demoting the owner, the last owner being deactivated, and a
 * self-delete that leaves nobody in charge.
 */

const owner = { id: 1, role: "owner" as const };
const admin = { id: 2, role: "admin" as const };
const editor = { id: 3, role: "editor" as const };

describe("canManageStaff", () => {
  it("lets the owner manage an admin", () => {
    expect(
      canManageStaff(owner, { id: 2, role: "admin", isActive: true }, "change_role"),
    ).toEqual({ allowed: true });
  });

  it("stops an admin from touching the owner", () => {
    const result = canManageStaff(admin, { id: 1, role: "owner", isActive: true }, "change_role");
    expect(result.allowed).toBe(false);
  });

  it("stops an admin from deactivating the owner", () => {
    const result = canManageStaff(admin, { id: 1, role: "owner", isActive: true }, "deactivate");
    expect(result.allowed).toBe(false);
  });

  it("stops an admin from deleting the owner", () => {
    const result = canManageStaff(admin, { id: 1, role: "owner", isActive: true }, "delete");
    expect(result.allowed).toBe(false);
  });

  it("lets the owner act on their own account", () => {
    expect(
      canManageStaff(owner, { id: 1, role: "owner", isActive: true }, "change_role"),
    ).toEqual({ allowed: true });
  });

  it("stops anyone deleting their own account", () => {
    const result = canManageStaff(owner, { id: 1, role: "owner", isActive: true }, "delete");
    expect(result.allowed).toBe(false);
    expect(result.allowed === false && result.reason).toContain("your own account");
  });

  it("stops an admin managing another admin", () => {
    const result = canManageStaff(admin, { id: 9, role: "admin", isActive: true }, "change_role");
    expect(result.allowed).toBe(false);
  });

  it("lets an admin manage an editor", () => {
    expect(
      canManageStaff(admin, { id: 3, role: "editor", isActive: true }, "deactivate"),
    ).toEqual({ allowed: true });
  });

  it("stops an editor managing anyone", () => {
    const result = canManageStaff(editor, { id: 4, role: "support", isActive: true }, "change_role");
    expect(result.allowed).toBe(false);
  });

  it("allows revoking sessions on a lower-ranked account", () => {
    expect(
      canManageStaff(admin, { id: 3, role: "editor", isActive: true }, "revoke_sessions"),
    ).toEqual({ allowed: true });
  });
});

describe("canAssignRole", () => {
  it("lets the owner assign owner", () => {
    expect(canAssignRole(owner, "owner")).toEqual({ allowed: true });
  });

  it("stops an admin assigning owner", () => {
    expect(canAssignRole(admin, "owner").allowed).toBe(false);
  });

  it("lets an admin assign admin", () => {
    expect(canAssignRole(admin, "admin")).toEqual({ allowed: true });
  });

  it("stops an editor assigning admin", () => {
    expect(canAssignRole(editor, "admin").allowed).toBe(false);
  });
});

describe("assignableRoles", () => {
  it("gives the owner every role", () => {
    expect(assignableRoles(owner)).toEqual(["support", "editor", "admin", "owner"]);
  });

  it("stops an admin from offering owner", () => {
    expect(assignableRoles(admin)).not.toContain("owner");
  });

  it("gives support only support", () => {
    expect(assignableRoles({ id: 5, role: "support" })).toEqual(["support"]);
  });
});

describe("wouldRemoveLastOwner", () => {
  it("blocks demoting the only owner", () => {
    expect(
      wouldRemoveLastOwner(
        { id: 1, role: "owner", isActive: true },
        { role: "admin" },
        1,
      ),
    ).toBe(true);
  });

  it("blocks deactivating the only owner", () => {
    expect(
      wouldRemoveLastOwner(
        { id: 1, role: "owner", isActive: true },
        { isActive: false },
        1,
      ),
    ).toBe(true);
  });

  it("allows demoting an owner when another active owner exists", () => {
    expect(
      wouldRemoveLastOwner(
        { id: 1, role: "owner", isActive: true },
        { role: "admin" },
        2,
      ),
    ).toBe(false);
  });

  it("ignores accounts that are not active owners", () => {
    expect(
      wouldRemoveLastOwner(
        { id: 3, role: "editor", isActive: true },
        { isActive: false },
        1,
      ),
    ).toBe(false);
  });

  it("allows a no-op change on the only owner", () => {
    expect(
      wouldRemoveLastOwner(
        { id: 1, role: "owner", isActive: true },
        { role: "owner", isActive: true },
        1,
      ),
    ).toBe(false);
  });
});

describe("describeRoleChange", () => {
  it("names a real change", () => {
    expect(describeRoleChange("editor", "admin")).toBe("role editor → admin");
  });

  it("says so when nothing changed", () => {
    expect(describeRoleChange("admin", "admin")).toBe("role unchanged (admin)");
  });
});
