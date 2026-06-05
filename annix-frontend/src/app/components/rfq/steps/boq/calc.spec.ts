import type { SdrValue } from "@annix/product-data/hdpe";
import { describe, expect, it } from "vitest";
import {
  fallbackBendWeight,
  fallbackFittingWeight,
  fallbackPipeWeight,
  resolveHdpeDims,
  resolveHdpePn,
  resolveSteelPipeDims,
} from "./calc";

describe("resolveHdpePn", () => {
  it("uses global PN when set as a number", () => {
    expect(resolveHdpePn(11 as SdrValue, 16)).toBe(16);
  });

  it("uses global PN when set as a numeric string", () => {
    expect(resolveHdpePn(11 as SdrValue, "16")).toBe(16);
  });

  it("ignores zero PN as falsy and falls back to SDR-derived", () => {
    // SDR 11 PE100 → PN16 per pnClassForSdr
    expect(resolveHdpePn(11 as SdrValue, 0)).toBe(16);
  });

  it("ignores negative PN and falls back", () => {
    expect(resolveHdpePn(11 as SdrValue, -5)).toBe(16);
  });

  it("ignores non-numeric global string and falls back", () => {
    // "PN16" parses to NaN, so the helper falls through to SDR-derived
    expect(resolveHdpePn(11 as SdrValue, "PN16")).toBe(16);
  });

  it("derives PN from SDR when no global set", () => {
    expect(resolveHdpePn(11 as SdrValue, null)).toBe(16);
    expect(resolveHdpePn(11 as SdrValue, undefined)).toBe(16);
  });

  it("derives PN from SDR 17 → PN10", () => {
    expect(resolveHdpePn(17 as SdrValue, null)).toBe(10);
  });

  it("derives PN from SDR 6 → PN25", () => {
    expect(resolveHdpePn(6 as SdrValue, null)).toBe(25);
  });
});

describe("resolveHdpeDims", () => {
  it("uses entry-level SDR override over global", () => {
    const dims = resolveHdpeDims(110, { specs: { hdpeSdr: 17 } }, 11, null);
    expect(dims.sdr).toBe(17);
  });

  it("uses global SDR when entry has none", () => {
    const dims = resolveHdpeDims(110, { specs: {} }, 11, null);
    expect(dims.sdr).toBe(11);
  });

  it("derives SDR from global PN when neither sdr is set", () => {
    // PN16 PE100 → SDR11 per selectSdrForPressure
    const dims = resolveHdpeDims(110, { specs: {} }, null, 16);
    expect(dims.sdr).toBe(11);
  });

  it("falls back to default SDR 11 when nothing is set", () => {
    const dims = resolveHdpeDims(110, { specs: {} }, null, null);
    expect(dims.sdr).toBe(11);
  });

  it("returns table OD/WT for known size + SDR", () => {
    const dims = resolveHdpeDims(110, { specs: {} }, 11, null);
    expect(dims.od).toBeGreaterThan(100);
    expect(dims.od).toBeLessThan(120);
    expect(dims.wt).toBeGreaterThan(0);
  });
});

describe("fallbackPipeWeight", () => {
  it("returns cached totalPipeWeight when present", () => {
    expect(
      fallbackPipeWeight({ calculation: { totalPipeWeight: 123.45 }, specs: {} }, 100, 6, 2, null),
    ).toBe(123.45);
  });

  it("falls back to a Sch 40 assumed weight for steel with no wallThickness", () => {
    // Previously returned 0 (a misleading blank). Now resolveSteelPipeDims
    // supplies a Sch 40/STD wall (100NB → 6.02mm, OD 114.3) so the row prices.
    // perMetre = (114.3-6.02)*6.02*0.02466 ≈ 16.07 kg/m × 12 m ≈ 193 kg.
    const w = fallbackPipeWeight(
      { materialType: "steel", specs: { quantityValue: 5 } },
      100,
      6,
      2,
      null,
    );
    expect(w).toBeGreaterThan(180);
    expect(w).toBeLessThan(205);
  });

  it("still returns 0 for a non-standard steel NB with nothing to fall back to", () => {
    expect(fallbackPipeWeight({ materialType: "steel", specs: {} }, 37, 6, 2, null)).toBe(0);
  });

  it("computes a sensible non-zero for HDPE with default SDR", () => {
    // OD = nb 110, SDR 11 → wt = 10, formula (od-wt)*wt*k where k=0.003016
    // perMetre = (110-10)*10*0.003016 ≈ 3.016 kg/m
    // total length = 6 * 2 = 12 m → ≈ 36 kg
    const w = fallbackPipeWeight(
      { materialType: "hdpe", specs: { nominalBoreMm: 110 } },
      110,
      6,
      2,
      null,
    );
    expect(w).toBeGreaterThan(30);
    expect(w).toBeLessThan(40);
  });

  it("uses entry.specs.quantityValue as total length when quantityType=total_length", () => {
    // length comes from quantityValue, not pipeLength*pipeQty
    const w = fallbackPipeWeight(
      {
        materialType: "hdpe",
        specs: { nominalBoreMm: 110, quantityType: "total_length", quantityValue: 100 },
      },
      110,
      6,
      999,
      null,
    );
    // perMetre ≈ 3.016, length = 100 → ≈ 301.6 kg
    expect(w).toBeGreaterThan(290);
    expect(w).toBeLessThan(310);
  });

  it("uses pipeLength × pipeQty as fallback total length", () => {
    const w = fallbackPipeWeight(
      { materialType: "hdpe", specs: { nominalBoreMm: 110 } },
      110,
      6,
      2,
      null,
    );
    // total length = 12 m
    expect(w).toBeCloseTo(3.016 * 12, 0);
  });

  it("respects explicit wt override on entry", () => {
    // Custom wt = 5; OD = 110; perMetre = (110-5)*5*0.003016 ≈ 1.5834 kg/m
    const w = fallbackPipeWeight(
      { materialType: "hdpe", specs: { nominalBoreMm: 110, wallThicknessMm: 5 } },
      110,
      6,
      2,
      null,
    );
    expect(w).toBeCloseTo(1.5834 * 12, 0);
  });
});

describe("fallbackBendWeight", () => {
  it("returns cached totalWeight when present", () => {
    expect(fallbackBendWeight({ calculation: { totalWeight: 88 }, specs: {} }, 100, null)).toBe(88);
  });

  it("returns cached bendWeight when present", () => {
    expect(fallbackBendWeight({ calculation: { bendWeight: 77 }, specs: {} }, 100, null)).toBe(77);
  });

  it("returns 0 for steel bend with no wt", () => {
    expect(fallbackBendWeight({ materialType: "steel", specs: {} }, 100, null)).toBe(0);
  });

  it("computes sensible weight for HDPE 90° 1.5D bend", () => {
    // 90°, 1.5D, NB=110: arc = (110*1.5/1000) * (90*pi/180) = 0.165 * 1.5708 ≈ 0.259 m
    // SDR 11 wt = 10, perMetre ≈ 3.016 → ≈ 0.78 kg
    const w = fallbackBendWeight(
      {
        materialType: "hdpe",
        specs: { bendDegrees: 90, bendType: "1.5D" },
      },
      110,
      null,
    );
    expect(w).toBeGreaterThan(0.5);
    expect(w).toBeLessThan(1.0);
  });

  it("defaults to 90° + 1.5D when bend specs absent", () => {
    const w = fallbackBendWeight({ materialType: "hdpe", specs: {} }, 110, null);
    expect(w).toBeGreaterThan(0.5);
  });
});

describe("fallbackFittingWeight", () => {
  it("returns cached fittingWeight when present", () => {
    expect(
      fallbackFittingWeight({ calculation: { fittingWeight: 99 }, specs: {} }, 100, 100, null),
    ).toBe(99);
  });

  it("returns cached totalWeight when present", () => {
    expect(
      fallbackFittingWeight({ calculation: { totalWeight: 55 }, specs: {} }, 100, 100, null),
    ).toBe(55);
  });

  it("returns 0 for steel fitting with no wt", () => {
    expect(fallbackFittingWeight({ materialType: "steel", specs: {} }, 100, 100, null)).toBe(0);
  });

  it("computes sensible weight for HDPE equal tee", () => {
    // OD=110, SDR 11 wt=10. Run 2*OD/1000 = 0.22m, branch OD/1000 = 0.11m
    // perMetre ≈ 3.016 → run weight ≈ 0.66, branch ≈ 0.33 → ≈ 1.0 kg
    const w = fallbackFittingWeight({ materialType: "hdpe", specs: {} }, 110, 110, null);
    expect(w).toBeGreaterThan(0.7);
    expect(w).toBeLessThan(1.5);
  });

  it("uses branchNb when different from main nb", () => {
    const equal = fallbackFittingWeight({ materialType: "hdpe", specs: {} }, 110, 110, null);
    const reducer = fallbackFittingWeight({ materialType: "hdpe", specs: {} }, 110, 50, null);
    // smaller branch → smaller weight
    expect(reducer).toBeLessThan(equal);
  });

  it("defaults branchNb to nb when 0/undefined passed", () => {
    const explicit = fallbackFittingWeight({ materialType: "hdpe", specs: {} }, 110, 110, null);
    const fallback = fallbackFittingWeight({ materialType: "hdpe", specs: {} }, 110, 0, null);
    expect(fallback).toBeCloseTo(explicit, 5);
  });
});

describe("resolveSteelPipeDims", () => {
  it("uses the extracted wall thickness over everything (source 'extracted')", () => {
    const dims = resolveSteelPipeDims(250, {
      description: "250NB Pipe ERW Heavy Class",
      specs: { wallThicknessMm: 6 },
    });
    expect(dims.wt).toBe(6);
    expect(dims.source).toBe("extracted");
    expect(dims.assumed).toBe(false);
    // OD resolved from the NB→OD table when no calc OD present
    expect(dims.od).toBeCloseTo(273.0, 3);
  });

  it("prefers the calculation-block OD when present", () => {
    const dims = resolveSteelPipeDims(250, {
      description: "250NB",
      specs: { wallThicknessMm: 6 },
      calculation: { outsideDiameterMm: 272.5 },
    });
    expect(dims.od).toBe(272.5);
  });

  it("resolves a rolled-from-plate stub to the plate thickness (source 'plate')", () => {
    const dims = resolveSteelPipeDims(150, {
      description: "150NB rolled stub",
      specs: { plateThicknessMm: 6 },
    });
    expect(dims.wt).toBe(6);
    expect(dims.source).toBe("plate");
    expect(dims.assumed).toBe(false);
  });

  it("converts a stated SANS 62 Heavy Class into wall + OD (source 'sabs62-heavy')", () => {
    const dims = resolveSteelPipeDims(50, {
      description: "50NB ERW Heavy Class Steel Pipe",
      specs: {},
    });
    expect(dims.wt).toBeCloseTo(3.9, 3);
    expect(dims.od).toBeCloseTo(60.3, 3);
    expect(dims.source).toBe("sabs62-heavy");
    expect(dims.assumed).toBe(false);
  });

  it("converts a stated Medium Class into the medium SANS 62 wall (source 'sabs62-medium')", () => {
    const dims = resolveSteelPipeDims(50, {
      description: "50NB Medium Class Steel Pipe",
      specs: {},
    });
    expect(dims.wt).toBeCloseTo(3.2, 3);
    expect(dims.source).toBe("sabs62-medium");
  });

  it("defaults to Sch 40/STD as a FLAGGED assumption when nothing is stated", () => {
    const dims = resolveSteelPipeDims(250, { description: "250NB Pipe ERW", specs: {} });
    expect(dims.od).toBeCloseTo(273.0, 3);
    expect(dims.wt).toBeCloseTo(9.27, 3);
    expect(dims.source).toBe("assumed-sch40");
    expect(dims.assumed).toBe(true);
  });

  it("returns 'unresolved' (wt 0) for a non-standard NB with nothing stated", () => {
    const dims = resolveSteelPipeDims(37, { description: "37NB mystery", specs: {} });
    expect(dims.wt).toBe(0);
    expect(dims.source).toBe("unresolved");
    expect(dims.assumed).toBe(false);
  });

  it("ignores a zero/negative extracted wall and falls through to the class", () => {
    const dims = resolveSteelPipeDims(50, {
      description: "50NB Heavy Class",
      specs: { wallThicknessMm: 0 },
    });
    expect(dims.source).toBe("sabs62-heavy");
  });
});
