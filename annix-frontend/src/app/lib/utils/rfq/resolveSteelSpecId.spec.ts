import { describe, expect, it } from "vitest";
import { resolveSteelSpecId } from "./resolveSteelSpecId";

const STEEL_SPECS = [
  { id: 1, steelSpecName: "API 5L" },
  { id: 2, steelSpecName: "API 5L Gr B" },
  { id: 3, steelSpecName: "ASTM A106" },
  { id: 4, steelSpecName: "ASTM A106 Gr B" },
  { id: 5, steelSpecName: "SABS 719" },
  { id: 6, steelSpecName: "ASTM A234 WPB" },
  { id: 7, steelSpecName: "ASTM A105" },
];

describe("resolveSteelSpecId", () => {
  it("returns undefined when the master list is empty", () => {
    expect(resolveSteelSpecId("Carbon Steel", "API 5L", [])).toBeUndefined();
  });

  it("returns undefined when material + grade are both empty", () => {
    expect(resolveSteelSpecId(null, null, STEEL_SPECS)).toBeUndefined();
    expect(resolveSteelSpecId("", "", STEEL_SPECS)).toBeUndefined();
  });

  it("matches a plain API 5L grade", () => {
    expect(resolveSteelSpecId("Carbon Steel", "API 5L", STEEL_SPECS)).toBe(1);
  });

  it("prefers the more-specific API 5L Gr B over plain API 5L", () => {
    expect(resolveSteelSpecId("Carbon Steel", "API 5L Gr B", STEEL_SPECS)).toBe(2);
  });

  it("prefers ASTM A106 Gr B over plain ASTM A106", () => {
    expect(resolveSteelSpecId(null, "ASTM A106 Gr B", STEEL_SPECS)).toBe(4);
  });

  it("matches SABS 719 from tender spec PDF text", () => {
    expect(resolveSteelSpecId(null, "SABS 719", STEEL_SPECS)).toBe(5);
  });

  it("handles ASTM A234 WPB (fitting spec)", () => {
    expect(resolveSteelSpecId(null, "ASTM A234 WPB", STEEL_SPECS)).toBe(6);
  });

  it("returns undefined when nothing matches", () => {
    expect(resolveSteelSpecId(null, "EN 10208-2", STEEL_SPECS)).toBeUndefined();
  });

  it("works against the materialGrade only when material is null (spec PDF case)", () => {
    expect(resolveSteelSpecId(null, "API 5L Gr B", STEEL_SPECS)).toBe(2);
  });

  it("is case-insensitive", () => {
    expect(resolveSteelSpecId(null, "api 5l gr b", STEEL_SPECS)).toBe(2);
  });

  it("trims extra whitespace", () => {
    expect(resolveSteelSpecId(null, "  API 5L  ", STEEL_SPECS)).toBe(1);
  });
});
