import { describe, expect, it } from "vitest";
import {
  FLANGE_MATERIALS,
  LIGHTING_CONFIG,
  PIPE_MATERIALS,
  STEELWORK_MATERIALS,
  WELD_MATERIALS,
} from "./rendering3DStandards";

const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) throw new Error(`Invalid hex color: ${hex}`);
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
};

const relativeLuminance = (hex: string): number => {
  const { r, g, b } = hexToRgb(hex);
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
};

describe("Material Visual Comparison Tests", () => {
  describe("Material Configuration Snapshots", () => {
    it("pipe materials should match expected configuration", () => {
      expect(PIPE_MATERIALS).toMatchSnapshot();
    });

    it("weld materials should match expected configuration", () => {
      expect(WELD_MATERIALS).toMatchSnapshot();
    });

    it("flange materials should match expected configuration", () => {
      expect(FLANGE_MATERIALS).toMatchSnapshot();
    });

    it("steelwork materials should match expected configuration", () => {
      expect(STEELWORK_MATERIALS).toMatchSnapshot();
    });

    it("lighting configuration should match expected setup", () => {
      expect(LIGHTING_CONFIG).toMatchSnapshot();
    });
  });

  describe("Visual Hierarchy Tests", () => {
    it("weld material should be darker than outer pipe surface", () => {
      const weldLuminance = relativeLuminance(WELD_MATERIALS.standard.color);
      const pipeLuminance = relativeLuminance(PIPE_MATERIALS.outer.color);
      expect(weldLuminance).toBeLessThan(pipeLuminance);
    });

    it("inner pipe surface should be darker than outer pipe surface", () => {
      const innerLuminance = relativeLuminance(PIPE_MATERIALS.inner.color);
      const outerLuminance = relativeLuminance(PIPE_MATERIALS.outer.color);
      expect(innerLuminance).toBeLessThan(outerLuminance);
    });

    it("pipe end highlight should be brighter than outer surface", () => {
      const endLuminance = relativeLuminance(PIPE_MATERIALS.end.color);
      const outerLuminance = relativeLuminance(PIPE_MATERIALS.outer.color);
      expect(endLuminance).toBeGreaterThan(outerLuminance);
    });

    it("blank flange should have distinct color from standard flange (warning color)", () => {
      const blankColor = hexToRgb(FLANGE_MATERIALS.blank.color);
      const standardColor = hexToRgb(FLANGE_MATERIALS.standard.color);
      expect(blankColor.r).toBeGreaterThan(blankColor.g);
      expect(blankColor.r).toBeGreaterThan(blankColor.b);
      expect(standardColor.r).toBeCloseTo(standardColor.g, -1);
      expect(standardColor.r).toBeCloseTo(standardColor.b, -1);
    });
  });

  describe("PBR Material Relationships", () => {
    it("weld materials should have matte finish (higher roughness than metal)", () => {
      const metalRoughness = PIPE_MATERIALS.outer.roughness;
      const weldRoughness = WELD_MATERIALS.standard.roughness;
      expect(weldRoughness).toBeGreaterThan(metalRoughness);
      expect(weldRoughness).toBeGreaterThanOrEqual(0.6);
    });

    it("flange materials should have polished finish (low roughness)", () => {
      expect(FLANGE_MATERIALS.standard.roughness).toBeLessThanOrEqual(0.2);
      expect(FLANGE_MATERIALS.bolt.roughness).toBeLessThanOrEqual(0.2);
    });

    it("all metal materials should have metalness >= 0.7", () => {
      const allMaterials = [
        ...Object.values(PIPE_MATERIALS),
        ...Object.values(FLANGE_MATERIALS),
        ...Object.values(STEELWORK_MATERIALS),
      ];
      allMaterials.forEach((material) => {
        expect(material.metalness).toBeGreaterThanOrEqual(0.7);
      });
    });

    it("weld material should have lower metalness (oxidized surface)", () => {
      expect(WELD_MATERIALS.standard.metalness).toBeLessThan(PIPE_MATERIALS.outer.metalness);
    });
  });

  describe("Steelwork Material Distinctiveness", () => {
    it("gusset colors should be visually distinct from base materials", () => {
      const blueGusset = hexToRgb(STEELWORK_MATERIALS.gussetBlue.color);
      const yellowGusset = hexToRgb(STEELWORK_MATERIALS.gussetYellow.color);
      const basePlate = hexToRgb(STEELWORK_MATERIALS.basePlate.color);

      expect(blueGusset.b).toBeGreaterThan(blueGusset.r);
      expect(blueGusset.b).toBeGreaterThan(blueGusset.g);

      expect(yellowGusset.r).toBeGreaterThan(yellowGusset.b);
      expect(yellowGusset.g).toBeGreaterThan(yellowGusset.b);

      expect(basePlate.r).toBeCloseTo(basePlate.g, -1);
      expect(basePlate.r).toBeCloseTo(basePlate.b, -1);
    });

    it("rib material should be slightly lighter than base plate", () => {
      const ribLuminance = relativeLuminance(STEELWORK_MATERIALS.rib.color);
      const basePlateLuminance = relativeLuminance(STEELWORK_MATERIALS.basePlate.color);
      expect(ribLuminance).toBeGreaterThan(basePlateLuminance);
    });
  });

  describe("Lighting Configuration Validation", () => {
    it("should have three-point lighting setup", () => {
      expect(LIGHTING_CONFIG.keyLight).toBeDefined();
      expect(LIGHTING_CONFIG.fillLight).toBeDefined();
      expect(LIGHTING_CONFIG.rimLight).toBeDefined();
    });

    it("key light should be brightest", () => {
      expect(LIGHTING_CONFIG.keyLight.intensity).toBeGreaterThan(
        LIGHTING_CONFIG.fillLight.intensity,
      );
      expect(LIGHTING_CONFIG.keyLight.intensity).toBeGreaterThan(
        LIGHTING_CONFIG.rimLight.intensity,
      );
    });

    it("fill light should be secondary intensity", () => {
      expect(LIGHTING_CONFIG.fillLight.intensity).toBeGreaterThan(
        LIGHTING_CONFIG.rimLight.intensity,
      );
    });

    it("lights should be positioned in different quadrants", () => {
      const [keyX, keyY, keyZ] = LIGHTING_CONFIG.keyLight.position;
      const [fillX, fillY, fillZ] = LIGHTING_CONFIG.fillLight.position;
      expect(Math.sign(keyX)).not.toBe(Math.sign(fillX));
    });

    it("ambient light should provide base illumination", () => {
      expect(LIGHTING_CONFIG.ambient.intensity).toBeGreaterThan(0);
      expect(LIGHTING_CONFIG.ambient.intensity).toBeLessThan(1);
    });
  });

  describe("Environment Map Settings", () => {
    it("pipe materials should have moderate environment reflection", () => {
      expect(PIPE_MATERIALS.outer.envMapIntensity).toBeGreaterThanOrEqual(1);
      expect(PIPE_MATERIALS.outer.envMapIntensity).toBeLessThanOrEqual(1.5);
    });

    it("weld materials should have reduced environment reflection", () => {
      expect(WELD_MATERIALS.standard.envMapIntensity).toBeLessThan(
        PIPE_MATERIALS.outer.envMapIntensity,
      );
    });

    it("flange materials should have higher environment reflection (polished)", () => {
      expect(FLANGE_MATERIALS.standard.envMapIntensity).toBeGreaterThan(
        PIPE_MATERIALS.outer.envMapIntensity,
      );
    });
  });

  describe("Color Consistency", () => {
    it("all colors should be valid hex format", () => {
      const allMaterials = [
        ...Object.values(PIPE_MATERIALS),
        ...Object.values(WELD_MATERIALS),
        ...Object.values(FLANGE_MATERIALS),
        ...Object.values(STEELWORK_MATERIALS),
      ];
      allMaterials.forEach((material) => {
        expect(material.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      });
    });

    it("pipe materials should use green-based color scheme", () => {
      const outerColor = hexToRgb(PIPE_MATERIALS.outer.color);
      const innerColor = hexToRgb(PIPE_MATERIALS.inner.color);
      const endColor = hexToRgb(PIPE_MATERIALS.end.color);

      expect(outerColor.g).toBeGreaterThan(outerColor.r);
      expect(innerColor.g).toBeGreaterThan(innerColor.r);
      expect(endColor.g).toBeGreaterThan(endColor.r);
    });

    it("weld materials should use neutral/dark colors", () => {
      const weldColor = hexToRgb(WELD_MATERIALS.standard.color);
      expect(Math.abs(weldColor.r - weldColor.g)).toBeLessThan(10);
      expect(Math.abs(weldColor.r - weldColor.b)).toBeLessThan(10);
    });
  });
});
