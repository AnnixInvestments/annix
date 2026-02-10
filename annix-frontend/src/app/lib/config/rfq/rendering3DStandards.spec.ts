import { describe, expect, it } from "vitest";
import {
  calculateArrowSize,
  calculateEffectiveWeldLength,
  calculateSteinmetzWeldLength,
  calculateVisualWallThickness,
  DIMENSION_STANDARDS,
  FLANGE_MATERIALS,
  GEOMETRY_CONSTANTS,
  LIGHTING_CONFIG,
  NB_TO_OD_LOOKUP,
  nbToOd,
  outerDiameterFromNB,
  PIPE_MATERIALS,
  SABS_719_WALL_THICKNESS,
  SCENE_CONSTANTS,
  STEELWORK_MATERIALS,
  wallThicknessFromNB,
  WELD_CONSTANTS,
  WELD_MATERIALS,
} from "./rendering3DStandards";

describe("rendering3DStandards", () => {
  describe("calculateVisualWallThickness", () => {
    it("should return actual wall thickness when above minimum visual ratio", () => {
      const od = 100;
      const actualWt = 15;
      const result = calculateVisualWallThickness(od, actualWt);
      expect(result).toBe(15);
    });

    it("should return minimum visual thickness when actual is too thin", () => {
      const od = 100;
      const actualWt = 2;
      const minVisual = od * GEOMETRY_CONSTANTS.MIN_VISUAL_WALL_RATIO;
      const result = calculateVisualWallThickness(od, actualWt);
      expect(result).toBe(minVisual);
      expect(result).toBeGreaterThan(actualWt);
    });

    it("should handle edge case where actual equals minimum", () => {
      const od = 100;
      const minVisual = od * GEOMETRY_CONSTANTS.MIN_VISUAL_WALL_RATIO;
      const result = calculateVisualWallThickness(od, minVisual);
      expect(result).toBe(minVisual);
    });

    it("should scale proportionally with different OD values", () => {
      const smallOd = 50;
      const largeOd = 500;
      const thinWall = 1;

      const smallResult = calculateVisualWallThickness(smallOd, thinWall);
      const largeResult = calculateVisualWallThickness(largeOd, thinWall);

      expect(largeResult).toBeGreaterThan(smallResult);
      expect(smallResult).toBe(smallOd * GEOMETRY_CONSTANTS.MIN_VISUAL_WALL_RATIO);
      expect(largeResult).toBe(largeOd * GEOMETRY_CONSTANTS.MIN_VISUAL_WALL_RATIO);
    });
  });

  describe("calculateArrowSize", () => {
    it("should return minimum arrow length for very short dimensions", () => {
      const shortDimension = 0.1;
      const result = calculateArrowSize(shortDimension);
      expect(result.length).toBe(DIMENSION_STANDARDS.arrowMinLength);
      expect(result.width).toBe(result.length * DIMENSION_STANDARDS.arrowWidthRatio);
    });

    it("should return maximum arrow length for very long dimensions", () => {
      const longDimension = 10;
      const result = calculateArrowSize(longDimension);
      expect(result.length).toBe(DIMENSION_STANDARDS.arrowMaxLength);
      expect(result.width).toBe(result.length * DIMENSION_STANDARDS.arrowWidthRatio);
    });

    it("should scale proportionally for mid-range dimensions", () => {
      const midDimension = 0.8;
      const expectedLength = midDimension * DIMENSION_STANDARDS.arrowLengthRatio;
      const result = calculateArrowSize(midDimension);
      expect(result.length).toBe(expectedLength);
      expect(result.width).toBe(expectedLength * DIMENSION_STANDARDS.arrowWidthRatio);
    });

    it("should always return positive values", () => {
      const dimensions = [0.01, 0.5, 1, 5, 20];
      dimensions.forEach((dim) => {
        const result = calculateArrowSize(dim);
        expect(result.length).toBeGreaterThan(0);
        expect(result.width).toBeGreaterThan(0);
      });
    });

    it("should maintain width-to-length ratio consistently", () => {
      const dimensions = [0.1, 0.5, 1, 2, 5];
      dimensions.forEach((dim) => {
        const result = calculateArrowSize(dim);
        expect(result.width / result.length).toBeCloseTo(DIMENSION_STANDARDS.arrowWidthRatio, 5);
      });
    });
  });

  describe("calculateSteinmetzWeldLength", () => {
    it("should calculate weld length using Steinmetz factor", () => {
      const odMm = 100;
      const result = calculateSteinmetzWeldLength(odMm);
      expect(result).toBe(WELD_CONSTANTS.STEINMETZ_FACTOR * odMm);
    });

    it("should scale linearly with OD", () => {
      const od1 = 200;
      const od2 = 400;
      const result1 = calculateSteinmetzWeldLength(od1);
      const result2 = calculateSteinmetzWeldLength(od2);
      expect(result2).toBe(result1 * 2);
    });

    it("should produce expected values for common pipe sizes", () => {
      const testCases = [
        { nb: 100, expectedOd: 114.3 },
        { nb: 200, expectedOd: 219.1 },
        { nb: 300, expectedOd: 323.9 },
      ];

      testCases.forEach(({ expectedOd }) => {
        const result = calculateSteinmetzWeldLength(expectedOd);
        expect(result).toBeCloseTo(WELD_CONSTANTS.STEINMETZ_FACTOR * expectedOd, 1);
      });
    });
  });

  describe("calculateEffectiveWeldLength", () => {
    it("should apply AWS D1.1 effective factor", () => {
      const totalLength = 150;
      const result = calculateEffectiveWeldLength(totalLength);
      expect(result).toBe(totalLength * WELD_CONSTANTS.AWS_EFFECTIVE_FACTOR);
    });

    it("should return approximately 66.7% of total length (AWS factor 1/1.5)", () => {
      const totalLength = 300;
      const result = calculateEffectiveWeldLength(totalLength);
      expect(result).toBeCloseTo(200, 1);
    });

    it("should handle zero length", () => {
      const result = calculateEffectiveWeldLength(0);
      expect(result).toBe(0);
    });

    it("should scale linearly", () => {
      const length1 = 100;
      const length2 = 200;
      const result1 = calculateEffectiveWeldLength(length1);
      const result2 = calculateEffectiveWeldLength(length2);
      expect(result2).toBe(result1 * 2);
    });
  });

  describe("nbToOd", () => {
    it("should return correct OD for known NB values", () => {
      expect(nbToOd(100)).toBe(114.3);
      expect(nbToOd(200)).toBe(219.1);
      expect(nbToOd(300)).toBe(323.9);
      expect(nbToOd(400)).toBe(406.4);
      expect(nbToOd(500)).toBe(508.0);
    });

    it("should return all standard NB to OD mappings correctly", () => {
      Object.entries(NB_TO_OD_LOOKUP).forEach(([nb, expectedOd]) => {
        expect(nbToOd(Number(nb))).toBe(expectedOd);
      });
    });

    it("should return fallback value for unknown NB", () => {
      const unknownNb = 999;
      const result = nbToOd(unknownNb);
      expect(result).toBe(unknownNb * 1.05);
    });

    it("should handle small NB values", () => {
      expect(nbToOd(15)).toBe(21.3);
      expect(nbToOd(20)).toBe(26.7);
      expect(nbToOd(25)).toBe(33.4);
    });

    it("should handle large NB values", () => {
      expect(nbToOd(800)).toBe(812.8);
      expect(nbToOd(850)).toBe(863.6);
      expect(nbToOd(900)).toBe(914.4);
    });

    it("should include extended range (1000+)", () => {
      expect(nbToOd(1000)).toBe(1016.0);
      expect(nbToOd(1050)).toBe(1066.8);
      expect(nbToOd(1200)).toBe(1219.2);
    });
  });

  describe("outerDiameterFromNB", () => {
    it("should return provided OD when given", () => {
      expect(outerDiameterFromNB(200, 220)).toBe(220);
    });

    it("should return lookup value when no OD provided", () => {
      expect(outerDiameterFromNB(200)).toBe(219.1);
      expect(outerDiameterFromNB(300)).toBe(323.9);
    });

    it("should return closest smaller NB for non-exact matches", () => {
      expect(outerDiameterFromNB(225)).toBe(219.1);
      expect(outerDiameterFromNB(999)).toBe(914.4);
    });

    it("should ignore zero or negative provided OD", () => {
      expect(outerDiameterFromNB(200, 0)).toBe(219.1);
    });
  });

  describe("wallThicknessFromNB", () => {
    it("should return provided WT when given", () => {
      expect(wallThicknessFromNB(200, 8.0)).toBe(8.0);
    });

    it("should return SABS 719 value when no WT provided", () => {
      expect(wallThicknessFromNB(200)).toBe(5.2);
      expect(wallThicknessFromNB(300)).toBe(6.4);
      expect(wallThicknessFromNB(850)).toBe(9.5);
      expect(wallThicknessFromNB(1200)).toBe(12.7);
    });

    it("should return closest smaller NB for non-exact matches", () => {
      expect(wallThicknessFromNB(225)).toBe(5.2);
      expect(wallThicknessFromNB(675)).toBe(8.0);
    });

    it("should return smallest entry for NB below range", () => {
      expect(wallThicknessFromNB(50)).toBe(5.2);
    });
  });

  describe("SABS_719_WALL_THICKNESS", () => {
    it("should have entries for standard pipe sizes", () => {
      expect(SABS_719_WALL_THICKNESS[200]).toBe(5.2);
      expect(SABS_719_WALL_THICKNESS[600]).toBe(6.4);
      expect(SABS_719_WALL_THICKNESS[900]).toBe(9.5);
    });

    it("should include extended sizes", () => {
      expect(SABS_719_WALL_THICKNESS[1000]).toBe(9.5);
      expect(SABS_719_WALL_THICKNESS[1200]).toBe(12.7);
    });
  });

  describe("SCENE_CONSTANTS", () => {
    it("should have valid preview scale", () => {
      expect(SCENE_CONSTANTS.PREVIEW_SCALE).toBeGreaterThan(1);
    });

    it("should have valid camera distance range", () => {
      expect(SCENE_CONSTANTS.MIN_CAMERA_DISTANCE).toBeGreaterThan(0);
      expect(SCENE_CONSTANTS.MAX_CAMERA_DISTANCE).toBeGreaterThan(SCENE_CONSTANTS.MIN_CAMERA_DISTANCE);
    });
  });

  describe("GEOMETRY_CONSTANTS extended ratios", () => {
    it("should have FITTING_SCALE for tee/lateral previews", () => {
      expect(GEOMETRY_CONSTANTS.FITTING_SCALE).toBe(100);
    });

    it("should have valid geometry ratios in 0-1 range", () => {
      expect(GEOMETRY_CONSTANTS.WELD_TUBE_RATIO).toBeGreaterThan(0);
      expect(GEOMETRY_CONSTANTS.WELD_TUBE_RATIO).toBeLessThan(1);
      expect(GEOMETRY_CONSTANTS.FLANGE_THICKNESS_RATIO).toBeGreaterThan(0);
      expect(GEOMETRY_CONSTANTS.FLANGE_THICKNESS_RATIO).toBeLessThan(1);
    });

    it("should have oversize ratios slightly above 1", () => {
      expect(GEOMETRY_CONSTANTS.WELD_RING_OVERSIZE).toBeGreaterThan(1);
      expect(GEOMETRY_CONSTANTS.WELD_RING_OVERSIZE).toBeLessThan(1.1);
      expect(GEOMETRY_CONSTANTS.SADDLE_WELD_OVERSIZE).toBeGreaterThan(1);
      expect(GEOMETRY_CONSTANTS.SADDLE_WELD_OVERSIZE).toBeLessThan(1.2);
    });
  });

  describe("LIGHTING_CONFIG", () => {
    it("should have warehouse environment preset", () => {
      expect(LIGHTING_CONFIG.environment.preset).toBe("warehouse");
    });

    it("should have three-point lighting with valid intensities", () => {
      expect(LIGHTING_CONFIG.ambient.intensity).toBeGreaterThan(0);
      expect(LIGHTING_CONFIG.keyLight.intensity).toBeGreaterThan(0);
      expect(LIGHTING_CONFIG.fillLight.intensity).toBeGreaterThan(0);
      expect(LIGHTING_CONFIG.keyLight.intensity).toBeGreaterThan(LIGHTING_CONFIG.fillLight.intensity);
    });
  });

  describe("Material Constants Validation", () => {
    it("should have valid PBR values for pipe materials", () => {
      Object.entries(PIPE_MATERIALS).forEach(([name, material]) => {
        expect(material.metalness).toBeGreaterThanOrEqual(0);
        expect(material.metalness).toBeLessThanOrEqual(1);
        expect(material.roughness).toBeGreaterThanOrEqual(0);
        expect(material.roughness).toBeLessThanOrEqual(1);
        expect(material.envMapIntensity).toBeGreaterThan(0);
        expect(material.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      });
    });

    it("should have valid PBR values for weld materials", () => {
      Object.entries(WELD_MATERIALS).forEach(([name, material]) => {
        expect(material.metalness).toBeGreaterThanOrEqual(0);
        expect(material.metalness).toBeLessThanOrEqual(1);
        expect(material.roughness).toBeGreaterThanOrEqual(0);
        expect(material.roughness).toBeLessThanOrEqual(1);
        expect(material.envMapIntensity).toBeGreaterThan(0);
        expect(material.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      });
    });

    it("should have valid PBR values for flange materials", () => {
      Object.entries(FLANGE_MATERIALS).forEach(([name, material]) => {
        expect(material.metalness).toBeGreaterThanOrEqual(0);
        expect(material.metalness).toBeLessThanOrEqual(1);
        expect(material.roughness).toBeGreaterThanOrEqual(0);
        expect(material.roughness).toBeLessThanOrEqual(1);
        expect(material.envMapIntensity).toBeGreaterThan(0);
        expect(material.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      });
    });

    it("should have valid PBR values for steelwork materials", () => {
      Object.entries(STEELWORK_MATERIALS).forEach(([name, material]) => {
        expect(material.metalness).toBeGreaterThanOrEqual(0);
        expect(material.metalness).toBeLessThanOrEqual(1);
        expect(material.roughness).toBeGreaterThanOrEqual(0);
        expect(material.roughness).toBeLessThanOrEqual(1);
        expect(material.envMapIntensity).toBeGreaterThan(0);
        expect(material.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      });
    });

    it("weld materials should have higher roughness than pipe materials (matte weld bead)", () => {
      expect(WELD_MATERIALS.standard.roughness).toBeGreaterThan(PIPE_MATERIALS.outer.roughness);
    });

    it("flange materials should have high metalness for polished look", () => {
      expect(FLANGE_MATERIALS.standard.metalness).toBeGreaterThanOrEqual(0.85);
      expect(FLANGE_MATERIALS.bolt.metalness).toBeGreaterThanOrEqual(0.85);
    });
  });
});
