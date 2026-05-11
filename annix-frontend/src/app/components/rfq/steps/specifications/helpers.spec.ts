import { describe, expect, it } from "vitest";
import type { PtRecommendationResult, ValidPressureClassInfo } from "@/app/lib/api/client";
import type { MaterialLimit } from "@/app/lib/query/hooks";
import {
  autoFilledClass,
  computeBarRating,
  dedupSortPressureClassesByDisplay,
  deriveMiningUvExposure,
  derivePressureClassOverrideStatus,
  deriveTemperatureCategory,
  extractPressureNumeric,
  findLowestSuitablePressureClass,
  isPressureClassMissingPTData,
  isPressureClassUnsuitable,
  isSteelSpecSuitable,
  serviceLifeToDurability,
  sortPressureClassesByNumericDesc,
  steelSpecLimitsLabel,
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

describe("dedupSortPressureClassesByDisplay", () => {
  it("returns empty array for empty input", () => {
    expect(dedupSortPressureClassesByDisplay([])).toEqual([]);
  });

  it("sorts numerically ascending by leading digit (not lexicographically)", () => {
    const rows = [
      { id: 1, designation: "100PN" },
      { id: 2, designation: "10PN" },
      { id: 3, designation: "16PN" },
      { id: 4, designation: "6PN" },
    ];
    const result = dedupSortPressureClassesByDisplay(rows);
    expect(result.map((r) => r.designation)).toEqual(["6PN", "10PN", "16PN", "100PN"]);
  });

  it("falls back to designation locale-compare when numerics tie", () => {
    const rows = [
      { id: 1, designation: "16PN-B" },
      { id: 2, designation: "16PN-A" },
    ];
    const result = dedupSortPressureClassesByDisplay(rows);
    expect(result.map((r) => r.id)).toEqual([2, 1]);
  });

  it("strips '/digit' suffix into displayValue but keeps original designation", () => {
    const rows = [{ id: 1, designation: "150/3" }];
    const [first] = dedupSortPressureClassesByDisplay(rows);
    expect(first.displayValue).toBe("150");
    expect(first.designation).toBe("150/3");
  });

  it("dedupes by displayValue (first-occurrence wins after sort)", () => {
    const rows = [
      { id: 1, designation: "100/2" },
      { id: 2, designation: "100/3" },
      { id: 3, designation: "16PN" },
    ];
    const result = dedupSortPressureClassesByDisplay(rows);
    expect(result.map((r) => r.id)).toEqual([3, 1]);
    expect(result.map((r) => r.displayValue)).toEqual(["16PN", "100"]);
  });

  it("is non-destructive on the input array", () => {
    const rows = [
      { id: 1, designation: "100PN" },
      { id: 2, designation: "10PN" },
    ];
    const snapshot = [...rows];
    dedupSortPressureClassesByDisplay(rows);
    expect(rows).toEqual(snapshot);
  });

  it("preserves extra fields on each row", () => {
    const rows = [{ id: 1, designation: "16PN", extra: "kept" }];
    const [first] = dedupSortPressureClassesByDisplay(rows);
    expect(first.extra).toBe("kept");
  });
});

describe("sortPressureClassesByNumericDesc", () => {
  it("returns empty array for empty input", () => {
    expect(sortPressureClassesByNumericDesc([])).toEqual([]);
  });

  it("sorts numerically descending by leading digit", () => {
    const rows = [
      { id: 1, designation: "10PN" },
      { id: 2, designation: "100PN" },
      { id: 3, designation: "6PN" },
      { id: 4, designation: "16PN" },
    ];
    const result = sortPressureClassesByNumericDesc(rows);
    expect(result.map((r) => r.designation)).toEqual(["100PN", "16PN", "10PN", "6PN"]);
  });

  it("treats designations without leading digits as 0", () => {
    const rows = [
      { id: 1, designation: "Class 150" },
      { id: 2, designation: "16PN" },
    ];
    const [highest] = sortPressureClassesByNumericDesc(rows);
    expect(highest.id).toBe(2);
  });

  it("is non-destructive on the input array", () => {
    const rows = [
      { id: 1, designation: "10PN" },
      { id: 2, designation: "100PN" },
    ];
    const snapshot = [...rows];
    sortPressureClassesByNumericDesc(rows);
    expect(rows).toEqual(snapshot);
  });
});

describe("extractPressureNumeric (undefined handling)", () => {
  it("returns 0 for undefined input", () => {
    expect(extractPressureNumeric(undefined)).toBe(0);
  });
});

describe("computeBarRating", () => {
  it("returns 0 for null/undefined/empty", () => {
    expect(computeBarRating(null)).toBe(0);
    expect(computeBarRating(undefined)).toBe(0);
    expect(computeBarRating("")).toBe(0);
  });

  it("returns the leading numeric for designations < 500", () => {
    expect(computeBarRating("16PN")).toBe(16);
    expect(computeBarRating("40PN")).toBe(40);
    expect(computeBarRating("150 Class")).toBe(150);
    expect(computeBarRating("499")).toBe(499);
  });

  it("divides by 100 for SABS 1123 designations >= 500 (600 -> 6, 1000 -> 10)", () => {
    expect(computeBarRating("600")).toBe(6);
    expect(computeBarRating("1000")).toBe(10);
    expect(computeBarRating("2500")).toBe(25);
  });

  it("treats exactly 500 as a SABS designation (5 bar)", () => {
    expect(computeBarRating("500")).toBe(5);
  });
});

describe("findLowestSuitablePressureClass", () => {
  const rows = [
    { id: 1, designation: "10PN" },
    { id: 2, designation: "16PN" },
    { id: 3, designation: "25PN" },
    { id: 4, designation: "40PN" },
  ];

  it("returns null for empty input", () => {
    expect(findLowestSuitablePressureClass([], 10)).toBeNull();
  });

  it("returns null when no class meets the target", () => {
    expect(findLowestSuitablePressureClass(rows, 100)).toBeNull();
  });

  it("returns the lowest class that meets or exceeds the target", () => {
    const result = findLowestSuitablePressureClass(rows, 16);
    expect(result?.id).toBe(2);
  });

  it("returns the lowest class above the target when no exact match", () => {
    const result = findLowestSuitablePressureClass(rows, 20);
    expect(result?.id).toBe(3);
  });

  it("respects the SABS 1123 bar-rating adjustment", () => {
    const sabsRows = [
      { id: 100, designation: "600" },
      { id: 101, designation: "1000" },
      { id: 102, designation: "2500" },
    ];
    expect(findLowestSuitablePressureClass(sabsRows, 8)?.id).toBe(101);
    expect(findLowestSuitablePressureClass(sabsRows, 5)?.id).toBe(100);
  });

  it("preserves extra fields on the matched row", () => {
    const result = findLowestSuitablePressureClass(
      [{ id: 1, designation: "16PN", extra: "kept" }],
      10,
    );
    expect(result?.extra).toBe("kept");
  });
});

const limit = (
  steelSpecName: string,
  maxTemperatureCelsius: number,
  maxPressureBar: number,
  minTemperatureCelsius = -29,
): MaterialLimit =>
  ({
    steelSpecName,
    maxTemperatureCelsius,
    minTemperatureCelsius,
    maxPressureBar,
  }) as unknown as MaterialLimit;

describe("isSteelSpecSuitable", () => {
  const limits: MaterialLimit[] = [limit("ASTM A106", 400, 100), limit("AISI 4340 wear", 200, 0)];

  it("returns true when no working pressure or temperature is set", () => {
    expect(isSteelSpecSuitable("ASTM A106", limits, undefined, undefined)).toBe(true);
  });

  it("returns true when allLimits is null/undefined (cache not loaded)", () => {
    expect(isSteelSpecSuitable("ASTM A106", null, 100, 50)).toBe(true);
    expect(isSteelSpecSuitable("ASTM A106", undefined, 100, 50)).toBe(true);
  });

  it("returns true when within limits", () => {
    expect(isSteelSpecSuitable("ASTM A106", limits, 100, 50)).toBe(true);
  });

  it("returns false when temperature exceeds the spec's max", () => {
    expect(isSteelSpecSuitable("ASTM A106", limits, 500, 50)).toBe(false);
  });

  it("returns false for wear-only spec under pressure load", () => {
    expect(isSteelSpecSuitable("AISI 4340 wear", limits, 100, 50)).toBe(false);
  });

  it("returns true (default safe) for an unknown spec name", () => {
    expect(isSteelSpecSuitable("UNKNOWN", limits, 100, 50)).toBe(true);
  });
});

describe("steelSpecLimitsLabel", () => {
  const limits: MaterialLimit[] = [limit("ASTM A106", 400, 100)];

  it("returns empty string when allLimits is null/undefined", () => {
    expect(steelSpecLimitsLabel("ASTM A106", null)).toBe("");
    expect(steelSpecLimitsLabel("ASTM A106", undefined)).toBe("");
  });

  it("returns empty string for an unknown spec", () => {
    expect(steelSpecLimitsLabel("UNKNOWN", limits)).toBe("");
  });

  it("returns ' [Max <N>°C]' for a known spec", () => {
    expect(steelSpecLimitsLabel("ASTM A106", limits)).toBe(" [Max 400°C]");
  });

  it("matches by partial spec name (specName includes the limit's steelSpecName)", () => {
    expect(steelSpecLimitsLabel("ASTM A106 Grade B Schedule 40", limits)).toBe(" [Max 400°C]");
  });
});
