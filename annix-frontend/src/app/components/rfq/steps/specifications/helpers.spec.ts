import { describe, expect, it } from "vitest";
import type { PtRecommendationResult, ValidPressureClassInfo } from "@/app/lib/api/client";
import {
  autoFilledClass,
  deriveMiningUvExposure,
  derivePressureClassOverrideStatus,
  deriveTemperatureCategory,
  extractPressureNumeric,
  isPressureClassMissingPTData,
  isPressureClassUnsuitable,
  serviceLifeToDurability,
} from "./helpers";

const classInfo = (id: number, designation: string, isAdequate = true): ValidPressureClassInfo =>
  ({
    id,
    designation,
    isAdequate,
  }) as unknown as ValidPressureClassInfo;

describe("extractPressureNumeric", () => {
  it("returns 0 for null", () => {
    expect(extractPressureNumeric(null)).toBe(0);
  });

  it("returns 0 for empty string", () => {
    expect(extractPressureNumeric("")).toBe(0);
  });

  it("returns 0 for non-numeric prefix like 'PN16'", () => {
    // PN16 starts with letters, no leading digit — function returns 0
    expect(extractPressureNumeric("PN16")).toBe(0);
  });

  it("extracts leading numeric prefix", () => {
    expect(extractPressureNumeric("16PN")).toBe(16);
    expect(extractPressureNumeric("150 Class")).toBe(150);
    expect(extractPressureNumeric("2500lb")).toBe(2500);
  });

  it("returns 0 for non-numeric prefix", () => {
    expect(extractPressureNumeric("Class 150")).toBe(0);
  });

  it("handles single-digit prefix", () => {
    expect(extractPressureNumeric("6 ")).toBe(6);
  });
});

describe("autoFilledClass", () => {
  it("returns emerald-styled classes when auto-filled", () => {
    const result = autoFilledClass(true);
    expect(result).toContain("border-emerald-500");
    expect(result).toContain("bg-emerald-50");
    expect(result).toContain("font-semibold");
  });

  it("returns neutral classes when not auto-filled", () => {
    const result = autoFilledClass(false);
    expect(result).toContain("border-gray-300");
    expect(result).toContain("text-gray-900");
    expect(result).not.toContain("emerald");
  });
});

describe("serviceLifeToDurability", () => {
  it("maps 'Short' to 'L'", () => {
    expect(serviceLifeToDurability("Short")).toBe("L");
  });

  it("maps 'Medium' to 'M'", () => {
    expect(serviceLifeToDurability("Medium")).toBe("M");
  });

  it("maps 'Long' to 'H'", () => {
    expect(serviceLifeToDurability("Long")).toBe("H");
  });

  it("maps 'Extended' to 'VH'", () => {
    expect(serviceLifeToDurability("Extended")).toBe("VH");
  });

  it("returns null for null input", () => {
    expect(serviceLifeToDurability(null)).toBeNull();
  });

  it("returns null for unknown values", () => {
    expect(serviceLifeToDurability("Forever")).toBeNull();
    expect(serviceLifeToDurability("")).toBeNull();
  });
});

describe("deriveTemperatureCategory", () => {
  it("returns null for null input", () => {
    expect(deriveTemperatureCategory(null)).toBeNull();
  });

  it("returns 'Ambient' for typical working temps (-20 to 60 °C)", () => {
    expect(deriveTemperatureCategory(-20)).toBe("Ambient");
    expect(deriveTemperatureCategory(0)).toBe("Ambient");
    expect(deriveTemperatureCategory(20)).toBe("Ambient");
    expect(deriveTemperatureCategory(60)).toBe("Ambient");
  });

  it("returns 'Elevated' for 60-120 °C", () => {
    // Note: 60 lands in "Ambient" branch first (< -20 || > 60 is false at exactly 60).
    // Above 60 enters the elevated/high branch.
    expect(deriveTemperatureCategory(80)).toBe("Elevated");
    expect(deriveTemperatureCategory(120)).toBe("Elevated");
  });

  it("returns 'High' for 120-200 °C", () => {
    expect(deriveTemperatureCategory(150)).toBe("High");
    expect(deriveTemperatureCategory(200)).toBe("High");
  });

  it("returns 'High' for above 200 °C", () => {
    expect(deriveTemperatureCategory(250)).toBe("High");
    expect(deriveTemperatureCategory(500)).toBe("High");
  });

  it("returns 'Ambient' for cryogenic (below -20)", () => {
    expect(deriveTemperatureCategory(-40)).toBe("Ambient");
    expect(deriveTemperatureCategory(-100)).toBe("Ambient");
  });
});

describe("derivePressureClassOverrideStatus", () => {
  const rows = [
    { id: 1, designation: "16PN" },
    { id: 2, designation: "40PN" },
    { id: 3, designation: "100PN" },
  ];

  it("returns not-override when currentId is null", () => {
    expect(derivePressureClassOverrideStatus(null, 2, rows)).toEqual({
      isOverride: false,
      isHigher: false,
      isLower: false,
    });
  });

  it("returns not-override when autoId is null", () => {
    expect(derivePressureClassOverrideStatus(2, null, rows)).toEqual({
      isOverride: false,
      isHigher: false,
      isLower: false,
    });
  });

  it("returns not-override when currentId matches autoId", () => {
    expect(derivePressureClassOverrideStatus(2, 2, rows)).toEqual({
      isOverride: false,
      isHigher: false,
      isLower: false,
    });
  });

  it("returns override but neither higher nor lower when designations cannot be looked up", () => {
    expect(derivePressureClassOverrideStatus(1, 2, null)).toEqual({
      isOverride: true,
      isHigher: false,
      isLower: false,
    });
  });

  it("returns override + isHigher when current numeric > auto numeric", () => {
    expect(derivePressureClassOverrideStatus(3, 1, rows)).toEqual({
      isOverride: true,
      isHigher: true,
      isLower: false,
    });
  });

  it("returns override + isLower when current numeric < auto numeric", () => {
    expect(derivePressureClassOverrideStatus(1, 3, rows)).toEqual({
      isOverride: true,
      isHigher: false,
      isLower: true,
    });
  });

  it("treats missing row as not-found (override, neither higher nor lower)", () => {
    expect(derivePressureClassOverrideStatus(99, 1, rows)).toEqual({
      isOverride: true,
      isHigher: false,
      isLower: false,
    });
  });
});

describe("isPressureClassUnsuitable", () => {
  const map = new Map<number, ValidPressureClassInfo>([
    [1, classInfo(1, "16PN", true)],
    [2, classInfo(2, "40PN", false)],
  ]);

  it("returns false when currentId is null", () => {
    expect(isPressureClassUnsuitable(null, map)).toBe(false);
  });

  it("returns false when currentId is missing from the map", () => {
    expect(isPressureClassUnsuitable(99, map)).toBe(false);
  });

  it("returns false when the class info is adequate", () => {
    expect(isPressureClassUnsuitable(1, map)).toBe(false);
  });

  it("returns true when the class info is flagged not adequate", () => {
    expect(isPressureClassUnsuitable(2, map)).toBe(true);
  });
});

describe("isPressureClassMissingPTData", () => {
  const map = new Map<number, ValidPressureClassInfo>([[1, classInfo(1, "16PN")]]);
  const ptRecs = (validIds: number[]): Pick<PtRecommendationResult, "validPressureClasses"> => ({
    validPressureClasses: validIds.map((id) => classInfo(id, `${id}PN`)),
  });

  it("returns false when currentId is null", () => {
    expect(isPressureClassMissingPTData(null, map, ptRecs([1]))).toBe(false);
  });

  it("returns false when ptRecommendations is null", () => {
    expect(isPressureClassMissingPTData(1, map, null)).toBe(false);
  });

  it("returns false when class IS in the info map (data present)", () => {
    expect(isPressureClassMissingPTData(1, map, ptRecs([1]))).toBe(false);
  });

  it("returns false when class is missing but there are no valid classes either", () => {
    expect(isPressureClassMissingPTData(2, map, ptRecs([]))).toBe(false);
  });

  it("returns true when class missing AND valid classes exist", () => {
    expect(isPressureClassMissingPTData(2, map, ptRecs([1]))).toBe(true);
  });
});

describe("deriveMiningUvExposure", () => {
  it("returns null when mine is not selected", () => {
    expect(deriveMiningUvExposure(false, "C5")).toBeNull();
    expect(deriveMiningUvExposure(false, null)).toBeNull();
  });

  it("returns 'High' for C5 / CX categories", () => {
    expect(deriveMiningUvExposure(true, "C5")).toBe("High");
    expect(deriveMiningUvExposure(true, "CX")).toBe("High");
  });

  it("returns 'Moderate' for C3 / C4 categories", () => {
    expect(deriveMiningUvExposure(true, "C3")).toBe("Moderate");
    expect(deriveMiningUvExposure(true, "C4")).toBe("Moderate");
  });

  it("returns 'Moderate' for C1 / C2 categories", () => {
    expect(deriveMiningUvExposure(true, "C1")).toBe("Moderate");
    expect(deriveMiningUvExposure(true, "C2")).toBe("Moderate");
  });

  it("returns 'High' as a default when mine selected but no ISO category", () => {
    expect(deriveMiningUvExposure(true, null)).toBe("High");
  });

  it("returns 'High' for unrecognised ISO values when mine selected", () => {
    expect(deriveMiningUvExposure(true, "anything-else")).toBe("High");
  });
});
