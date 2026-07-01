import { MaterialSpecialization } from "../../supplier/entities/supplier-capability.entity";
import {
  evaluateSizePressureMaterial,
  itemDiameterMm,
  normaliseMaterial,
  parsePressureRange,
  parseSizeRangeMm,
} from "./capability-matching";

describe("capability-matching", () => {
  describe("parseSizeRangeMm", () => {
    it("parses a DN range as millimetres", () => {
      expect(parseSizeRangeMm("DN15 - DN600")).toEqual({ minMm: 15, maxMm: 600 });
    });

    it("converts an inch range to millimetres", () => {
      const range = parseSizeRangeMm('6" - 48"');
      expect(range?.minMm).toBeCloseTo(152.4);
      expect(range?.maxMm).toBeCloseTo(1219.2);
    });

    it("returns null for empty input", () => {
      expect(parseSizeRangeMm(null)).toBeNull();
      expect(parseSizeRangeMm("no numbers here")).toBeNull();
    });
  });

  describe("parsePressureRange", () => {
    it("parses a PN range", () => {
      expect(parsePressureRange("PN10 - PN40")).toEqual({ unit: "pn", min: 10, max: 40 });
    });

    it("parses a class (pound) range", () => {
      expect(parsePressureRange("150# - 600#")).toEqual({ unit: "class", min: 150, max: 600 });
    });

    it("returns null when no unit is recognisable", () => {
      expect(parsePressureRange("10 - 40")).toBeNull();
    });
  });

  describe("normaliseMaterial", () => {
    it("classifies mild steel as carbon steel", () => {
      expect(normaliseMaterial("Mild Steel SABS 719")).toBe(MaterialSpecialization.CARBON_STEEL);
    });

    it("classifies 316 as stainless", () => {
      expect(normaliseMaterial("ASTM A312 TP316")).toBe(MaterialSpecialization.STAINLESS_STEEL);
    });

    it("classifies PE100 as hdpe", () => {
      expect(normaliseMaterial("HDPE PE100 SDR11")).toBe(MaterialSpecialization.HDPE);
    });

    it("returns null when nothing matches", () => {
      expect(normaliseMaterial(null, undefined)).toBeNull();
    });
  });

  describe("itemDiameterMm", () => {
    it("passes through mm diameters", () => {
      expect(itemDiameterMm({ diameter: 200, diameterUnit: "mm" })).toBe(200);
    });

    it("converts inch diameters", () => {
      expect(itemDiameterMm({ diameter: 8, diameterUnit: "inch" })).toBeCloseTo(203.2);
    });
  });

  describe("evaluateSizePressureMaterial", () => {
    it("warns when the item size is outside the supplier range", () => {
      const result = evaluateSizePressureMaterial(
        { diameter: 900, diameterUnit: "mm", material: "carbon steel" },
        {
          sizeRangeDescription: "DN15 - DN600",
          materialSpecializations: [MaterialSpecialization.CARBON_STEEL],
        },
      );
      expect(result.warnings.some((w) => w.includes("outside supplier range"))).toBe(true);
    });

    it("does not penalise when supplier data is missing", () => {
      const missing = evaluateSizePressureMaterial(
        { diameter: 900, diameterUnit: "mm", material: "carbon steel" },
        {},
      );
      const inRange = evaluateSizePressureMaterial(
        { diameter: 200, diameterUnit: "mm", material: "carbon steel" },
        { sizeRangeDescription: "DN15 - DN600" },
      );
      expect(missing.warnings).toHaveLength(0);
      expect(inRange.score).toBeGreaterThanOrEqual(missing.score);
    });

    it("warns on a material the supplier does not list", () => {
      const result = evaluateSizePressureMaterial(
        { diameter: 100, diameterUnit: "mm", material: "HDPE PE100" },
        { materialSpecializations: [MaterialSpecialization.CARBON_STEEL] },
      );
      expect(result.warnings.some((w) => w.includes("not in supplier specialisations"))).toBe(true);
    });
  });
});
