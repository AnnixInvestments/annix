import { describe, expect, it } from "vitest";
import {
  type FlangeSpecLookup,
  getFlangeSpec,
  getSteelSpecName,
  type SteelSpecLookup,
} from "./spec";

const baseFlangeLookup: FlangeSpecLookup = {
  globalFlangeStandardId: null,
  globalFlangePressureClassId: null,
  flangeStandards: [
    { id: 1, code: "ASME B16.5" },
    { id: 2, code: "SANS 1123" },
  ],
  pressureClasses: [
    { id: 10, designation: "Class 150" },
    { id: 20, designation: "PN16" },
    { id: 30, designation: "PN10" },
  ],
};

describe("getFlangeSpec", () => {
  it("returns 'PN16' default when entry and global are both empty", () => {
    expect(getFlangeSpec({ specs: {} }, baseFlangeLookup)).toBe("PN16");
  });

  it("uses entry-level standard + pressure when set", () => {
    expect(
      getFlangeSpec(
        { specs: { flangeStandardId: 2, flangePressureClassId: 20 } },
        baseFlangeLookup,
      ),
    ).toBe("SANS 1123 PN16");
  });

  it("falls back to global standard when entry has none", () => {
    expect(
      getFlangeSpec(
        { specs: { flangePressureClassId: 30 } },
        { ...baseFlangeLookup, globalFlangeStandardId: 1 },
      ),
    ).toBe("ASME B16.5 PN10");
  });

  it("entry-level wins over global when both set", () => {
    expect(
      getFlangeSpec(
        { specs: { flangeStandardId: 2, flangePressureClassId: 20 } },
        { ...baseFlangeLookup, globalFlangeStandardId: 1, globalFlangePressureClassId: 10 },
      ),
    ).toBe("SANS 1123 PN16");
  });

  it("returns 'PN16' when standard id is set but lookup misses", () => {
    expect(
      getFlangeSpec(
        { specs: { flangeStandardId: 999, flangePressureClassId: 20 } },
        baseFlangeLookup,
      ),
    ).toBe("PN16");
  });

  it("returns 'PN16' when pressure class id is set but lookup misses", () => {
    expect(
      getFlangeSpec(
        { specs: { flangeStandardId: 1, flangePressureClassId: 999 } },
        baseFlangeLookup,
      ),
    ).toBe("PN16");
  });

  it("returns 'PN16' when masterData lookups are undefined", () => {
    expect(
      getFlangeSpec(
        { specs: { flangeStandardId: 1, flangePressureClassId: 10 } },
        { ...baseFlangeLookup, flangeStandards: undefined, pressureClasses: undefined },
      ),
    ).toBe("PN16");
  });
});

const baseSteelLookup: SteelSpecLookup = {
  globalSteelSpecificationId: null,
  steelSpecs: [
    { id: 1, steelSpecName: "ASTM A106 Gr B" },
    { id: 2, steelSpecName: "API 5L X42" },
  ],
};

describe("getSteelSpecName", () => {
  it("returns 'Steel' default when entry and global are both empty", () => {
    expect(getSteelSpecName({ specs: {} }, baseSteelLookup)).toBe("Steel");
  });

  it("uses entry-level steelSpecificationId", () => {
    expect(getSteelSpecName({ specs: { steelSpecificationId: 1 } }, baseSteelLookup)).toBe(
      "ASTM A106 Gr B",
    );
  });

  it("falls back to global when entry has none", () => {
    expect(
      getSteelSpecName({ specs: {} }, { ...baseSteelLookup, globalSteelSpecificationId: 2 }),
    ).toBe("API 5L X42");
  });

  it("entry-level wins over global", () => {
    expect(
      getSteelSpecName(
        { specs: { steelSpecificationId: 1 } },
        { ...baseSteelLookup, globalSteelSpecificationId: 2 },
      ),
    ).toBe("ASTM A106 Gr B");
  });

  it("returns 'Steel' fallback when id is set but lookup misses", () => {
    expect(getSteelSpecName({ specs: { steelSpecificationId: 999 } }, baseSteelLookup)).toBe(
      "Steel",
    );
  });

  it("returns 'Steel' when steelSpecs is undefined", () => {
    expect(
      getSteelSpecName(
        { specs: { steelSpecificationId: 1 } },
        { ...baseSteelLookup, steelSpecs: undefined },
      ),
    ).toBe("Steel");
  });
});
