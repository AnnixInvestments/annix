import { describe, expect, it } from "vitest";
import {
  filletWeldMetalKgPerM,
  minFilletLegMm,
  type PlatePart,
  plateAreaM2,
  platePartWeightKg,
  tankPlateTakeoff,
  verifyTankMass,
  weldTakeoff,
} from "./tankTakeoff";

describe("minFilletLegMm (AISC/AWS minimum fillet)", () => {
  it("returns 0 for unknown / non-positive thickness", () => {
    expect(minFilletLegMm(0)).toBe(0);
    expect(minFilletLegMm(-5)).toBe(0);
  });

  it("≤6mm plate → 3mm leg (and the boundary at exactly 6)", () => {
    expect(minFilletLegMm(3)).toBe(3);
    expect(minFilletLegMm(6)).toBe(3);
  });

  it("6–13mm plate → 5mm leg", () => {
    expect(minFilletLegMm(6.1)).toBe(5);
    expect(minFilletLegMm(10)).toBe(5);
    expect(minFilletLegMm(13)).toBe(5);
  });

  it("13–19mm plate → 6mm leg", () => {
    expect(minFilletLegMm(13.1)).toBe(6);
    expect(minFilletLegMm(16)).toBe(6);
    expect(minFilletLegMm(19)).toBe(6);
  });

  it(">19mm plate → 8mm leg", () => {
    expect(minFilletLegMm(19.1)).toBe(8);
    expect(minFilletLegMm(25)).toBe(8);
  });
});

describe("filletWeldMetalKgPerM (0.5·leg²·ρ)", () => {
  it("6mm fillet ≈ 0.1413 kg/m", () => {
    expect(filletWeldMetalKgPerM(6)).toBeCloseTo(0.1413, 4);
  });

  it("5mm fillet ≈ 0.098125 kg/m", () => {
    expect(filletWeldMetalKgPerM(5)).toBeCloseTo(0.098125, 5);
  });

  it("8mm fillet ≈ 0.2512 kg/m", () => {
    expect(filletWeldMetalKgPerM(8)).toBeCloseTo(0.2512, 4);
  });

  it("0 leg → 0 kg/m", () => {
    expect(filletWeldMetalKgPerM(0)).toBe(0);
  });

  it("scales with the square of the leg", () => {
    expect(filletWeldMetalKgPerM(10)).toBeCloseTo(4 * filletWeldMetalKgPerM(5), 6);
  });
});

describe("plateAreaM2", () => {
  it("uses stated areaM2 when positive", () => {
    expect(plateAreaM2({ areaM2: 2.5 })).toBe(2.5);
  });

  it("derives area from L×W (mm → m²) when no stated area", () => {
    expect(plateAreaM2({ lengthMm: 1000, widthMm: 500 })).toBeCloseTo(0.5, 6);
  });

  it("prefers stated area over L×W", () => {
    expect(plateAreaM2({ areaM2: 2.5, lengthMm: 1000, widthMm: 500 })).toBe(2.5);
  });

  it("falls back to L×W when stated area is zero / non-positive", () => {
    expect(plateAreaM2({ areaM2: 0, lengthMm: 1000, widthMm: 500 })).toBeCloseTo(0.5, 6);
  });

  it("returns 0 when neither area nor full dims are present", () => {
    expect(plateAreaM2({})).toBe(0);
    expect(plateAreaM2({ lengthMm: 1000 })).toBe(0);
  });
});

describe("platePartWeightKg (per single plate, no qty)", () => {
  it("uses stated cutting-list weight when positive", () => {
    expect(platePartWeightKg({ weightKg: 95.4 })).toBe(95.4);
  });

  it("prefers stated weight even when thickness+area are present", () => {
    expect(platePartWeightKg({ weightKg: 95.4, thicknessMm: 10, areaM2: 1 })).toBe(95.4);
  });

  it("computes weight from thickness × area × density when no stated weight", () => {
    // 10mm × 1.0m² × 7850 = 78.5 kg
    expect(platePartWeightKg({ thicknessMm: 10, areaM2: 1.0 })).toBeCloseTo(78.5, 6);
  });

  it("computes weight from thickness × (L×W) when no stated area", () => {
    expect(platePartWeightKg({ thicknessMm: 10, lengthMm: 1000, widthMm: 1000 })).toBeCloseTo(
      78.5,
      6,
    );
  });

  it("falls through a zero stated weight to the computed value", () => {
    expect(platePartWeightKg({ weightKg: 0, thicknessMm: 10, areaM2: 1.0 })).toBeCloseTo(78.5, 6);
  });

  it("returns 0 when thickness or area is missing", () => {
    expect(platePartWeightKg({ thicknessMm: 0, areaM2: 1.0 })).toBe(0);
    expect(platePartWeightKg({ thicknessMm: 10 })).toBe(0);
    expect(platePartWeightKg({})).toBe(0);
  });
});

describe("tankPlateTakeoff", () => {
  it("multiplies per-part qty by tank qty and sums the mass", () => {
    const plates: PlatePart[] = [
      { mark: "1", weightKg: 10, quantity: 2 },
      { mark: "2", weightKg: 5, quantity: 1 },
    ];
    const out = tankPlateTakeoff(plates, 1);
    expect(out.rows.map((r) => r.qty)).toEqual([2, 1]);
    expect(out.rows.map((r) => r.weightKg)).toEqual([20, 5]);
    expect(out.computedSteelMassKg).toBe(25);
  });

  it("scales row qty and weight by tank quantity > 1", () => {
    const plates: PlatePart[] = [{ weightKg: 10, quantity: 2 }];
    const out = tankPlateTakeoff(plates, 3);
    expect(out.rows[0].qty).toBe(6);
    expect(out.rows[0].weightKg).toBe(60);
    expect(out.computedSteelMassKg).toBe(60);
  });

  it("defaults per-part qty to 1 and tank qty to 1", () => {
    const out = tankPlateTakeoff([{ weightKg: 7 }], 0);
    expect(out.rows[0].qty).toBe(1);
    expect(out.computedSteelMassKg).toBe(7);
  });

  it("passes through mark, description and thickness", () => {
    const out = tankPlateTakeoff([{ mark: "A", description: "Shell", thicknessMm: 6 }], 1);
    expect(out.rows[0]).toMatchObject({ mark: "A", description: "Shell", thicknessMm: 6 });
  });

  it("returns empty rows and zero mass for an empty BOM", () => {
    const out = tankPlateTakeoff([], 1);
    expect(out.rows).toEqual([]);
    expect(out.computedSteelMassKg).toBe(0);
  });

  it("cross-checks against the real Obsideo underflow mass (≈360kg)", () => {
    // Per-part weights read off CD1-6149's cutting list.
    const plates: PlatePart[] = [
      { weightKg: 3.8, quantity: 1 },
      { weightKg: 95.4, quantity: 1 },
      { weightKg: 73.4, quantity: 1 },
      { weightKg: 30.1, quantity: 1 },
      { weightKg: 51.9, quantity: 1 },
      { weightKg: 3.6, quantity: 1 },
      { weightKg: 3.2, quantity: 1 },
      { weightKg: 1.4, quantity: 1 },
      { weightKg: 5.2, quantity: 1 },
      { weightKg: 2.5, quantity: 1 },
      { weightKg: 5.9, quantity: 4 },
      { weightKg: 1.4, quantity: 8 },
      { weightKg: 0.4, quantity: 4 },
      { weightKg: 4.2, quantity: 4 },
      { weightKg: 0.1, quantity: 8 },
      { weightKg: 1.6, quantity: 8 },
      { weightKg: 1.9, quantity: 3 },
    ];
    const out = tankPlateTakeoff(plates, 1);
    // Summed parts land within 10% of the stated 360kg steel mass.
    expect(out.computedSteelMassKg).toBeGreaterThan(324);
    expect(out.computedSteelMassKg).toBeLessThan(396);
  });
});

describe("weldTakeoff", () => {
  it("uses the drawing's stated weld size over the AISC fallback", () => {
    const out = weldTakeoff(
      [{ thicknessMm: 10, lengthMm: 1000, widthMm: 500 }],
      { weldSizeMm: 6 },
      1,
    );
    expect(out.legMm).toBe(6);
    expect(out.legSource).toBe("drawing");
  });

  it("falls back to the AISC minimum fillet when no weld size is stated", () => {
    const out = weldTakeoff([{ thicknessMm: 10, lengthMm: 1000, widthMm: 500 }], {}, 1);
    // dominant thickness 10mm → 5mm AISC leg
    expect(out.legMm).toBe(5);
    expect(out.legSource).toBe("AISC min");
  });

  it("computes length from plate perimeter × 0.5 joint fraction", () => {
    // perimeter = 2(1000+500)/1000 = 3.0 m; × 0.5 × 1 × 1 = 1.5 m
    const out = weldTakeoff(
      [{ thicknessMm: 6, lengthMm: 1000, widthMm: 500, quantity: 1 }],
      { weldSizeMm: 6 },
      1,
    );
    expect(out.lengthM).toBeCloseTo(1.5, 6);
    expect(out.basis).toBe("per-plate perimeter");
    // weight = 1.5 m × 0.1413 kg/m
    expect(out.weightKg).toBeCloseTo(1.5 * 0.1413, 4);
  });

  it("multiplies length by per-part qty and tank qty", () => {
    const out = weldTakeoff(
      [{ thicknessMm: 6, lengthMm: 1000, widthMm: 500, quantity: 2 }],
      { weldSizeMm: 6 },
      3,
    );
    // 1.5 m base × 2 parts × 3 tanks = 9.0 m
    expect(out.lengthM).toBeCloseTo(9.0, 6);
  });

  it("uses a square-equivalent perimeter from area when L×W absent", () => {
    // perimeter = 4·√area = 4·√4 = 8 m; × 0.5 = 4 m
    const out = weldTakeoff([{ thicknessMm: 6, areaM2: 4 }], { weldSizeMm: 6 }, 1);
    expect(out.lengthM).toBeCloseTo(4.0, 6);
    expect(out.basis).toBe("per-plate perimeter");
  });

  it("falls back to a tank-area estimate when no per-plate geometry resolves", () => {
    // plate has thickness only (no L/W/area) → 0 length from plates →
    // fallback 2·√(partCount × coatingArea) = 2·√(1 × 8.15)
    const out = weldTakeoff([{ thicknessMm: 6 }], { coatingAreaM2: 8.15 }, 1);
    expect(out.lengthM).toBeCloseTo(2 * Math.sqrt(8.15), 6);
    expect(out.basis).toBe("tank-area fallback");
  });

  it("prefers coating area over lining area in the fallback", () => {
    const out = weldTakeoff([{ thicknessMm: 6 }], { coatingAreaM2: 8, liningAreaM2: 4 }, 1);
    expect(out.lengthM).toBeCloseTo(2 * Math.sqrt(8), 6);
  });

  it("uses lining area in the fallback when no coating area", () => {
    const out = weldTakeoff([{ thicknessMm: 6 }], { liningAreaM2: 6 }, 1);
    expect(out.lengthM).toBeCloseTo(2 * Math.sqrt(6), 6);
  });

  it("reports 'unresolved' with zero length when there is no geometry at all", () => {
    const out = weldTakeoff([{ thicknessMm: 6 }], {}, 1);
    expect(out.lengthM).toBe(0);
    expect(out.weightKg).toBe(0);
    expect(out.basis).toBe("unresolved");
  });

  it("handles an empty plate list as unresolved", () => {
    const out = weldTakeoff([], {}, 1);
    expect(out.lengthM).toBe(0);
    expect(out.basis).toBe("unresolved");
  });

  it("applies the stated weld size to the fallback weight too", () => {
    const out = weldTakeoff([{ thicknessMm: 6 }], { coatingAreaM2: 8.15, weldSizeMm: 8 }, 1);
    expect(out.legMm).toBe(8);
    expect(out.legSource).toBe("drawing");
    expect(out.weightKg).toBeCloseTo(out.lengthM * filletWeldMetalKgPerM(8), 6);
  });
});

describe("verifyTankMass", () => {
  it("verifies when the summed parts are within ±10% of stated", () => {
    const v = verifyTankMass(360, 343, 1);
    expect(v.status).toBe("verified");
    expect(v.diffPct).toBeCloseTo(17 / 360, 4);
  });

  it("flags a check when the parts sum is outside ±10%", () => {
    const v = verifyTankMass(360, 286, 1);
    expect(v.status).toBe("check");
    expect(v.diffPct).toBeCloseTo(74 / 360, 4);
  });

  it("treats exactly 10% as verified (inclusive boundary)", () => {
    expect(verifyTankMass(100, 110, 1).status).toBe("verified");
    expect(verifyTankMass(100, 90, 1).status).toBe("verified");
  });

  it("flags just over 10% as a check", () => {
    expect(verifyTankMass(100, 111, 1).status).toBe("check");
  });

  it("multiplies the stated per-tank mass by tank qty before comparing", () => {
    const v = verifyTankMass(100, 200, 2);
    expect(v.statedTotalKg).toBe(200);
    expect(v.status).toBe("verified");
    expect(v.diffPct).toBe(0);
  });

  it("returns 'none' when there is no stated mass", () => {
    const v = verifyTankMass(null, 343, 1);
    expect(v.status).toBe("none");
    expect(v.statedTotalKg).toBeNull();
    expect(v.diffPct).toBeNull();
  });

  it("returns 'none' when nothing computed", () => {
    const v = verifyTankMass(360, 0, 1);
    expect(v.status).toBe("none");
    expect(v.statedTotalKg).toBe(360);
  });
});
