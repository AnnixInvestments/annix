import type { FlangeTypeWeightRecord } from "@annix/product-data/rfq";
import { describe, expect, it } from "vitest";
import {
  calculateBlankFlangeWeight,
  resolveFlangeConfig,
  scheduleToFittingClass,
} from "./rfqFlangeCalculations";

const mockMasterData = {
  flangeStandards: [
    { id: 1, code: "ASME B16.5" },
    { id: 2, code: "SABS 1123" },
  ],
  pressureClasses: [
    { id: 10, designation: "PN16" },
    { id: 11, designation: "1000kPa" },
  ],
};

const mockWeights: FlangeTypeWeightRecord[] = [
  {
    id: 1,
    flange_standard_id: 1,
    pressure_class: "PN16",
    flange_type_code: "BL",
    nominal_bore_mm: 100,
    weight_kg: 7.5,
  },
  {
    id: 2,
    flange_standard_id: 1,
    pressure_class: "1000/8",
    flange_type_code: "BL",
    nominal_bore_mm: 100,
    weight_kg: 9.25,
  },
];

describe("rfqFlangeCalculations", () => {
  describe("scheduleToFittingClass", () => {
    it("returns STD for the canonical STD schedule", () => {
      expect(scheduleToFittingClass("STD")).toBe("STD");
      expect(scheduleToFittingClass("std")).toBe("STD");
    });

    it("returns STD for any schedule containing 40", () => {
      expect(scheduleToFittingClass("40")).toBe("STD");
      expect(scheduleToFittingClass("Sch40")).toBe("STD");
      expect(scheduleToFittingClass("Schedule 40")).toBe("STD");
      expect(scheduleToFittingClass("40S")).toBe("STD");
    });

    it("returns XH for XS/XH/80 schedules", () => {
      expect(scheduleToFittingClass("XS")).toBe("XH");
      expect(scheduleToFittingClass("XH")).toBe("XH");
      expect(scheduleToFittingClass("80")).toBe("XH");
      expect(scheduleToFittingClass("Sch80")).toBe("XH");
      expect(scheduleToFittingClass("xs")).toBe("XH");
    });

    it("returns XXH for XXS/XXH/160 schedules", () => {
      expect(scheduleToFittingClass("XXS")).toBe("XXH");
      expect(scheduleToFittingClass("XXH")).toBe("XXH");
      expect(scheduleToFittingClass("160")).toBe("XXH");
      expect(scheduleToFittingClass("Sch160")).toBe("XXH");
      expect(scheduleToFittingClass("xxs")).toBe("XXH");
    });

    it("prioritises XXH over XH when 160 is present", () => {
      // 160 is XXH; even if "80" appears as a substring of "1080" we still want XXH
      expect(scheduleToFittingClass("160")).toBe("XXH");
    });

    it("returns empty string for unknown schedules", () => {
      expect(scheduleToFittingClass("")).toBe("");
      expect(scheduleToFittingClass("LIGHT")).toBe("");
      expect(scheduleToFittingClass("MEDIUM")).toBe("");
      expect(scheduleToFittingClass("HEAVY")).toBe("");
      expect(scheduleToFittingClass("10")).toBe("");
      expect(scheduleToFittingClass("20")).toBe("");
      // XS-LITE is NOT recognized as XH because the check is exact-match `=== "XS"`,
      // not substring-includes — only literal "XS"/"XH" or "80"-containing schedules count
      expect(scheduleToFittingClass("XS-LITE")).toBe("");
    });
  });

  describe("calculateBlankFlangeWeight", () => {
    it("returns 0 when nominalBoreMm is missing", () => {
      expect(calculateBlankFlangeWeight(mockWeights, null, "PN16", "ASME B16.5")).toBe(0);
      expect(calculateBlankFlangeWeight(mockWeights, undefined, "PN16", "ASME B16.5")).toBe(0);
      expect(calculateBlankFlangeWeight(mockWeights, 0, "PN16", "ASME B16.5")).toBe(0);
    });

    it("returns 0 when pressureClassDesignation is missing", () => {
      expect(calculateBlankFlangeWeight(mockWeights, 100, null, "ASME B16.5")).toBe(0);
      expect(calculateBlankFlangeWeight(mockWeights, 100, undefined, "ASME B16.5")).toBe(0);
      expect(calculateBlankFlangeWeight(mockWeights, 100, "", "ASME B16.5")).toBe(0);
    });

    it("uses regular blankFlangeWeight for non-SABS standards", () => {
      // PN16 / 100mm matches mockWeights[0] with weight 7.5
      expect(calculateBlankFlangeWeight(mockWeights, 100, "PN16", "ASME B16.5")).toBe(7.5);
      expect(calculateBlankFlangeWeight(mockWeights, 100, "PN16", "EN 1092-1")).toBe(7.5);
    });

    it("uses sansBlankFlangeWeight when standard contains SABS 1123", () => {
      // SANS path resolves "1000/8" → matches mockWeights[1] with weight 9.25
      expect(calculateBlankFlangeWeight(mockWeights, 100, "1000kPa", "SABS 1123")).toBe(9.25);
    });

    it("uses sansBlankFlangeWeight when standard contains SANS 1123", () => {
      expect(calculateBlankFlangeWeight(mockWeights, 100, "1000kPa", "SANS 1123")).toBe(9.25);
    });

    it("is case-sensitive on the SABS/SANS literal — lowercase is treated as non-SABS", () => {
      // "sans 1123" does NOT match the strict .includes("SANS 1123") check, so it
      // routes through the regular blankFlangeWeight path. The mock has no PN16 +
      // "1000kPa" entry, so the function falls back to nominalBoreMm * 0.15 = 15
      expect(calculateBlankFlangeWeight(mockWeights, 100, "1000kPa", "sans 1123")).toBe(15);
    });
  });

  describe("resolveFlangeConfig", () => {
    it("uses item-level specs when present", () => {
      const result = resolveFlangeConfig(
        { flangeStandardId: 1, flangePressureClassId: 10, flangeTypeCode: "WN" },
        { flangeStandardId: 2, flangePressureClassId: 11, flangeTypeCode: "BL" },
        mockMasterData,
      );
      expect(result.flangeStandardId).toBe(1);
      expect(result.flangePressureClassId).toBe(10);
      expect(result.flangeStandardCode).toBe("ASME B16.5");
      expect(result.pressureClassDesignation).toBe("PN16");
      expect(result.flangeTypeCode).toBe("WN");
    });

    it("falls back to globalSpecs when item-level fields are missing", () => {
      const result = resolveFlangeConfig(
        {},
        { flangeStandardId: 2, flangePressureClassId: 11, flangeTypeCode: "BL" },
        mockMasterData,
      );
      expect(result.flangeStandardId).toBe(2);
      expect(result.flangePressureClassId).toBe(11);
      expect(result.flangeStandardCode).toBe("SABS 1123");
      expect(result.pressureClassDesignation).toBe("1000kPa");
      expect(result.flangeTypeCode).toBe("BL");
    });

    it("returns empty strings (not undefined) when nothing resolves", () => {
      const result = resolveFlangeConfig({}, null, mockMasterData);
      expect(result.flangeStandardId).toBeUndefined();
      expect(result.flangePressureClassId).toBeUndefined();
      expect(result.flangeStandardCode).toBe("");
      expect(result.pressureClassDesignation).toBe("");
      expect(result.flangeTypeCode).toBe("");
    });

    it("returns empty strings when ids are present but masterData has no match", () => {
      const result = resolveFlangeConfig(
        { flangeStandardId: 999, flangePressureClassId: 999 },
        null,
        mockMasterData,
      );
      expect(result.flangeStandardId).toBe(999);
      expect(result.flangePressureClassId).toBe(999);
      expect(result.flangeStandardCode).toBe("");
      expect(result.pressureClassDesignation).toBe("");
    });

    it("handles missing masterData arrays gracefully", () => {
      const result = resolveFlangeConfig(
        { flangeStandardId: 1, flangePressureClassId: 10 },
        null,
        {},
      );
      expect(result.flangeStandardCode).toBe("");
      expect(result.pressureClassDesignation).toBe("");
    });
  });
});
