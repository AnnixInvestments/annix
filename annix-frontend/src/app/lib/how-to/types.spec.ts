import { describe, expect, it } from "vitest";
import { guideVisibleToRole, isAdminOnly } from "./types";

type TestRole = "viewer" | "manager" | "admin";
const ALL_TEST_ROLES: readonly TestRole[] = ["viewer", "manager", "admin"];

describe("isAdminOnly", () => {
  it("returns true when only the admin role is assigned", () => {
    expect(isAdminOnly({ roles: ["admin"] as TestRole[] }, "admin")).toBe(true);
  });

  it("returns false when admin is one of several roles", () => {
    expect(isAdminOnly({ roles: ["admin", "manager"] as TestRole[] }, "admin")).toBe(false);
  });

  it("returns false when roles are empty", () => {
    expect(isAdminOnly({ roles: [] as TestRole[] }, "admin")).toBe(false);
  });

  it("returns false when only a non-admin role is assigned", () => {
    expect(isAdminOnly({ roles: ["viewer"] as TestRole[] }, "admin")).toBe(false);
  });

  it("supports custom admin role names", () => {
    expect(isAdminOnly({ roles: ["owner"] }, "owner")).toBe(true);
    expect(isAdminOnly({ roles: ["owner"] }, "admin")).toBe(false);
  });
});

describe("guideVisibleToRole", () => {
  it("returns true when the role is in the guide's role list", () => {
    const guide = { roles: ["viewer", "manager"] as TestRole[] };
    expect(guideVisibleToRole(guide, "viewer", ALL_TEST_ROLES)).toBe(true);
    expect(guideVisibleToRole(guide, "manager", ALL_TEST_ROLES)).toBe(true);
  });

  it("returns false when the role is not in the guide's role list", () => {
    const guide = { roles: ["admin"] as TestRole[] };
    expect(guideVisibleToRole(guide, "viewer", ALL_TEST_ROLES)).toBe(false);
  });

  it("returns false when the role is null", () => {
    const guide = { roles: ["viewer"] as TestRole[] };
    expect(guideVisibleToRole(guide, null, ALL_TEST_ROLES)).toBe(false);
  });

  it("returns false when the role is not in the known role set", () => {
    const guide = { roles: ["viewer"] as TestRole[] };
    expect(guideVisibleToRole(guide, "hacker", ALL_TEST_ROLES)).toBe(false);
  });

  it("returns false when roles are empty", () => {
    const guide = { roles: [] as TestRole[] };
    expect(guideVisibleToRole(guide, "admin", ALL_TEST_ROLES)).toBe(false);
  });
});
