import { isNumber } from "es-toolkit/compat";
import { STEEL_DENSITY_KG_PER_M3 } from "./constants";

// Fabricated-tank plate + weld take-off. Pure functions extracted from
// BOQStep so the maths is the single source of truth and unit-testable.
//
// These drive the BOQ for tanks / chutes / hoppers / vessels that Nix
// extracts as itemType "tank_chute": per-part plate weights, a summed
// steel mass cross-checked against the drawing's stated mass, and a
// weld linear-metre / weld-metal estimate. The weld SIZE comes from the
// drawing's stated fillet ("6 TYP") when present, falling back to the
// AISC/AWS minimum fillet for the plate thickness; the weld LENGTH is a
// geometry estimate (no published per-tonne factor exists).

export interface PlatePart {
  mark?: string | null;
  description?: string | null;
  thicknessMm?: number | null;
  lengthMm?: number | null;
  widthMm?: number | null;
  quantity?: number | null;
  weightKg?: number | null;
  areaM2?: number | null;
}

export interface TankWeldSpecs {
  weldSizeMm?: number | null;
  coatingAreaM2?: number | null;
  liningAreaM2?: number | null;
}

// AISC 360 / AWS D1.1 minimum fillet-weld leg (mm) for a plate
// thickness: ≤6→3, 6–13→5, 13–19→6, >19→8. Returns 0 for a
// non-positive (unknown) thickness so the caller can detect "no size".
export const minFilletLegMm = (thicknessMm: number): number =>
  thicknessMm <= 0 ? 0 : thicknessMm <= 6 ? 3 : thicknessMm <= 13 ? 5 : thicknessMm <= 19 ? 6 : 8;

// Fillet weld-metal mass per metre (kg/m) for a given leg size: the
// triangular fillet cross-section is 0.5·leg², × steel density.
export const filletWeldMetalKgPerM = (legMm: number): number =>
  (0.5 * legMm * legMm * STEEL_DENSITY_KG_PER_M3) / 1_000_000;

// Plate flat area (m²): the stated areaM2 when positive, else derived
// from L×W (mm → m²). Zero when neither is available.
export const plateAreaM2 = (plate: PlatePart): number => {
  const rawArea = plate.areaM2;
  const rawLen = plate.lengthMm;
  const rawWid = plate.widthMm;
  const len = isNumber(rawLen) ? rawLen : 0;
  const wid = isNumber(rawWid) ? rawWid : 0;
  const areaFromDims = len * wid > 0 ? (len * wid) / 1_000_000 : 0;
  return isNumber(rawArea) && rawArea > 0 ? rawArea : areaFromDims;
};

// Per-part plate weight (kg) for ONE plate (no qty multiplier): the
// stated cutting-list weightKg when positive, else thickness × area ×
// steel density. Zero when neither weight nor (thickness AND area) is
// known.
export const platePartWeightKg = (plate: PlatePart): number => {
  const rawWeight = plate.weightKg;
  const statedWeight = isNumber(rawWeight) && rawWeight > 0 ? rawWeight : 0;
  if (statedWeight > 0) return statedWeight;
  const rawThk = plate.thicknessMm;
  const thickness = isNumber(rawThk) ? rawThk : 0;
  const area = plateAreaM2(plate);
  return thickness > 0 && area > 0 ? area * (thickness / 1000) * STEEL_DENSITY_KG_PER_M3 : 0;
};

export interface PlateTakeoffRow {
  mark: string | null;
  description: string | null;
  thicknessMm: number;
  qty: number;
  weightKg: number;
}

export interface TankPlateTakeoff {
  rows: PlateTakeoffRow[];
  computedSteelMassKg: number;
}

// Expand a tank's plate BOM into per-part rows + summed steel mass.
// rowQty = per-part quantity × tank quantity; rowWeight = per-part
// weight × rowQty. computedSteelMassKg sums every row for the
// stated-vs-computed cross-check.
export const tankPlateTakeoff = (plates: PlatePart[], tankQty: number): TankPlateTakeoff => {
  const qty = tankQty > 0 ? tankQty : 1;
  let computedSteelMassKg = 0;
  const rows = plates.map((plate) => {
    const rawThk = plate.thicknessMm;
    const rawQty = plate.quantity;
    const rawMark = plate.mark;
    const rawDescription = plate.description;
    const thickness = isNumber(rawThk) ? rawThk : 0;
    const plateInstanceQty = isNumber(rawQty) ? rawQty : 1;
    const rowQty = plateInstanceQty * qty;
    const rowWeight = platePartWeightKg(plate) * rowQty;
    computedSteelMassKg += rowWeight;
    return {
      mark: rawMark ?? null,
      description: rawDescription ?? null,
      thicknessMm: thickness,
      qty: rowQty,
      weightKg: rowWeight,
    };
  });
  return { rows, computedSteelMassKg };
};

export type WeldSizeSource = "drawing" | "AISC min";
export type WeldBasis = "per-plate perimeter" | "tank-area fallback" | "unresolved";

export interface WeldTakeoff {
  lengthM: number;
  weightKg: number;
  legMm: number;
  legSource: WeldSizeSource;
  basis: WeldBasis;
}

const WELD_JOINT_FRACTION = 0.5;

// Weld take-off for a fabricated tank. Weld SIZE: the drawing's stated
// fillet (specs.weldSizeMm) when positive, else the AISC minimum for the
// dominant plate thickness. Weld LENGTH: Σ(plate perimeter) × 0.5 (an
// internal seam is ONE weld shared between two plate edges; free edges
// aren't welded). Perimeter from L×W, else a square-equivalent from the
// plate area. When no per-plate geometry resolves, fall back to a
// tank-level estimate from the coating (else lining) area × part count.
// Weld WEIGHT = length × fillet weld-metal/m at the effective leg.
export const weldTakeoff = (
  plates: PlatePart[],
  specs: TankWeldSpecs,
  tankQty: number,
): WeldTakeoff => {
  const qty = tankQty > 0 ? tankQty : 1;
  const rawStatedLeg = specs.weldSizeMm;
  const statedLegMm = isNumber(rawStatedLeg) && rawStatedLeg > 0 ? rawStatedLeg : 0;
  const legForThickness = (thicknessMm: number): number =>
    statedLegMm > 0 ? statedLegMm : minFilletLegMm(thicknessMm);

  let lengthM = 0;
  let weightKg = 0;
  let dominantThicknessMm = 0;
  plates.forEach((plate) => {
    const rawThk = plate.thicknessMm;
    const rawLen = plate.lengthMm;
    const rawWid = plate.widthMm;
    const rawArea = plate.areaM2;
    const rawQty = plate.quantity;
    const thickness = isNumber(rawThk) ? rawThk : 0;
    const len = isNumber(rawLen) ? rawLen : 0;
    const wid = isNumber(rawWid) ? rawWid : 0;
    const area = isNumber(rawArea) && rawArea > 0 ? rawArea : 0;
    const partQty = isNumber(rawQty) ? rawQty : 1;
    const perimeterM =
      len > 0 && wid > 0 ? (2 * (len + wid)) / 1000 : area > 0 ? 4 * Math.sqrt(area) : 0;
    const partLengthM = perimeterM * WELD_JOINT_FRACTION * partQty * qty;
    lengthM += partLengthM;
    if (thickness > dominantThicknessMm) dominantThicknessMm = thickness;
    weightKg += partLengthM * filletWeldMetalKgPerM(legForThickness(thickness));
  });

  let basis: WeldBasis = lengthM > 0 ? "per-plate perimeter" : "unresolved";
  if (lengthM === 0) {
    const rawCoat = specs.coatingAreaM2;
    const rawLining = specs.liningAreaM2;
    const coatArea = isNumber(rawCoat) && rawCoat > 0 ? rawCoat : 0;
    const liningArea = isNumber(rawLining) && rawLining > 0 ? rawLining : 0;
    const proxyArea = coatArea > 0 ? coatArea : liningArea;
    const partCount = plates.length > 0 ? plates.length : 1;
    if (proxyArea > 0) {
      lengthM = 2 * Math.sqrt(partCount * proxyArea) * qty;
      const fallbackThk = dominantThicknessMm > 0 ? dominantThicknessMm : 6;
      weightKg = lengthM * filletWeldMetalKgPerM(legForThickness(fallbackThk));
      basis = "tank-area fallback";
    }
  }

  const legMm = legForThickness(dominantThicknessMm > 0 ? dominantThicknessMm : 6);
  const legSource: WeldSizeSource = statedLegMm > 0 ? "drawing" : "AISC min";
  return { lengthM, weightKg, legMm, legSource, basis };
};

export type MassVerifyStatus = "verified" | "check" | "none";

export interface MassVerify {
  status: MassVerifyStatus;
  statedTotalKg: number | null;
  computedKg: number;
  diffPct: number | null;
}

// Cross-check the summed plate mass against the drawing's stated steel
// mass. statedPerTankKg is per-tank; multiplied by tankQty to match the
// computed total. "verified" when within ±10%, "check" when outside,
// "none" when there's nothing to compare.
export const verifyTankMass = (
  statedPerTankKg: number | null | undefined,
  computedKg: number,
  tankQty: number,
): MassVerify => {
  const qty = tankQty > 0 ? tankQty : 1;
  const hasStated = isNumber(statedPerTankKg) && statedPerTankKg > 0;
  if (!hasStated || computedKg <= 0) {
    const statedTotalKg = hasStated ? (statedPerTankKg as number) * qty : null;
    return { status: "none", statedTotalKg, computedKg, diffPct: null };
  }
  const statedTotalKg = (statedPerTankKg as number) * qty;
  const diffPct = Math.abs(statedTotalKg - computedKg) / statedTotalKg;
  return {
    status: diffPct <= 0.1 ? "verified" : "check",
    statedTotalKg,
    computedKg,
    diffPct,
  };
};
