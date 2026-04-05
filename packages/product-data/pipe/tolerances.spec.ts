import { describe, expect, it } from "vitest";
import { calculateTolerances, toleranceForPipe } from "./tolerances";

describe("toleranceForPipe", () => {
  it("returns ASME B36.10M tolerance for small NPS", () => {
    const spec = toleranceForPipe("ASME_B36_10M", 4);
    expect(spec).not.toBeNull();
    expect(spec?.npsMin).toBe(0.125);
    expect(spec?.odTolerancePct).toBe(0.4);
  });

  it("returns ASME B36.10M tolerance for large NPS", () => {
    const spec = toleranceForPipe("ASME_B36_10M", 24);
    expect(spec).not.toBeNull();
    expect(spec?.odToleranceMmMax).toBe(12.5);
  });

  it("returns ASME B36.19M tolerance for stainless", () => {
    const spec = toleranceForPipe("ASME_B36_19M", 6);
    expect(spec?.weightTolerancePct).toBe(5.0);
  });

  it("returns null for out-of-range NPS", () => {
    const spec = toleranceForPipe("ASME_B36_19M", 100);
    expect(spec).toBeNull();
  });
});

describe("calculateTolerances", () => {
  it("computes OD and wall min/max for a 4in carbon pipe", () => {
    const result = calculateTolerances(114.3, 6.02, "ASME_B36_10M", 4);
    expect(result).not.toBeNull();
    expect(result?.odMinMm).toBeLessThan(114.3);
    expect(result?.odMaxMm).toBeGreaterThan(114.3);
    expect(result?.wallMinMm).toBeCloseTo(114.3 * 0 + 6.02 * (1 - 0.125), 2);
  });

  it("returns null for zero dimensions", () => {
    expect(calculateTolerances(0, 6, "ASME_B36_10M", 4)).toBeNull();
  });
});
