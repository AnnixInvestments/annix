import { describe, expect, it } from "vitest";
import {
  defaultRubberSgByType,
  lookupRubberSgByCode,
  pricePerKgFromRoll,
  rubberRollKg,
  STANDARD_RUBBER_ROLL,
} from "./rubberRollMath";

describe("rubberRollKg", () => {
  it("computes 86.4 * sg for the standard 6x1200x12 roll", () => {
    expect(rubberRollKg({ ...STANDARD_RUBBER_ROLL, sg: 1.04 })).toBeCloseTo(89.856, 3);
    expect(rubberRollKg({ ...STANDARD_RUBBER_ROLL, sg: 1 })).toBeCloseTo(86.4, 3);
  });
});

describe("pricePerKgFromRoll", () => {
  it("derives the AU SG-A38B cost/kg (~98.41) from its 6mm roll price", () => {
    const result = pricePerKgFromRoll({
      rollPrice: 8842.51,
      ...STANDARD_RUBBER_ROLL,
      sg: 1.04,
    });
    expect(result).not.toBeNull();
    expect(result as number).toBeCloseTo(98.41, 2);
  });

  it("derives the Impilo cost/kg (~77.2) from its 6mm roll price", () => {
    const result = pricePerKgFromRoll({
      rollPrice: 7539,
      ...STANDARD_RUBBER_ROLL,
      sg: 1.13,
    });
    expect(result).not.toBeNull();
    expect(result as number).toBeCloseTo(77.2, 1);
  });

  it("returns null when sg or roll price is non-positive", () => {
    expect(pricePerKgFromRoll({ rollPrice: 0, ...STANDARD_RUBBER_ROLL, sg: 1.1 })).toBeNull();
    expect(pricePerKgFromRoll({ rollPrice: 5000, ...STANDARD_RUBBER_ROLL, sg: 0 })).toBeNull();
  });
});

describe("lookupRubberSgByCode", () => {
  it("resolves SG from the price product table by normalized code", () => {
    expect(lookupRubberSgByCode("1078")).toBeCloseTo(1.01, 2);
    expect(lookupRubberSgByCode("SC1078")).toBeCloseTo(1.01, 2);
  });

  it("returns null for an unknown code", () => {
    expect(lookupRubberSgByCode("ZZ9999")).toBeNull();
    expect(lookupRubberSgByCode(null)).toBeNull();
  });
});

describe("defaultRubberSgByType", () => {
  it("maps known compound types to fallback SG", () => {
    expect(defaultRubberSgByType("Natural")).toBe(1.05);
    expect(defaultRubberSgByType("Nitrile")).toBe(1.21);
    expect(defaultRubberSgByType("Neoprene")).toBe(1.4);
    expect(defaultRubberSgByType("Chlorobutyl")).toBe(1.13);
  });

  it("defaults to 1.1 for unknown or missing types", () => {
    expect(defaultRubberSgByType(null)).toBe(1.1);
    expect(defaultRubberSgByType("Mystery")).toBe(1.1);
  });
});
