import { describe, expect, it } from "vitest";
import { pvcDeratedWorkingPressure, pvcDeratingFactor } from "./temperature-derating";

describe("pvcDeratingFactor", () => {
  it("returns 1.0 for uPVC at the 20 °C reference", () => {
    expect(pvcDeratingFactor("uPVC", 20)).toBe(1.0);
  });

  it("interpolates linearly between curve points", () => {
    // uPVC 25 °C = 0.9, 30 °C = 0.8 → 27.5 °C should be 0.85
    expect(pvcDeratingFactor("uPVC", 27.5)).toBeCloseTo(0.85, 3);
  });

  it("clamps to the curve's first / last factor outside the bounds", () => {
    expect(pvcDeratingFactor("uPVC", 0)).toBe(1.1);
    expect(pvcDeratingFactor("uPVC", 100)).toBe(0.45);
  });

  it("uses the PVC-O curve when the type is PVC_O", () => {
    expect(pvcDeratingFactor("PVC_O", 20)).toBe(1.0);
    expect(pvcDeratingFactor("PVC_O", 45)).toBe(0.4);
  });

  it("uses the cPVC curve for cPVC and sustains pressure to higher temps", () => {
    expect(pvcDeratingFactor("cPVC", 60)).toBeCloseTo(0.68, 3);
    expect(pvcDeratingFactor("cPVC", 95)).toBe(0.45);
  });
});

describe("pvcDeratedWorkingPressure", () => {
  it("multiplies class pressure by the derating factor", () => {
    // 16 bar Class 16 uPVC at 35 °C: factor 0.7 → 11.2 bar
    expect(pvcDeratedWorkingPressure("uPVC", 16, 35)).toBeCloseTo(11.2, 3);
  });
});
