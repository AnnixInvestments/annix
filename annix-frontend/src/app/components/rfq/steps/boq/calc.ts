import {
  type HdpeNominalSize,
  pipeDimensions as hdpePipeDimensions,
  pnClassForSdr,
  type SdrValue,
  selectSdrForPressure,
} from "@annix/product-data/hdpe";
import { DEFAULT_HDPE_SDR, PIPE_WEIGHT_K_BY_PRODUCT_TYPE } from "./constants";

// Effective HDPE PN for the row's stub-flange spec. Priority:
// 1. globalSpecs.hdpePressureRating (explicit project-level pick)
// 2. derived from the resolved SDR via PE100 SDR↔PN table
// (e.g. SDR 11 → PN16, SDR 17 → PN10, SDR 6 → PN25). Returns null
// only when neither input is available — caller suppresses the
// suffix in that case.
export const resolveHdpePn = (
  sdr: SdrValue,
  globalHdpePressureRating: number | string | null | undefined,
): number | null => {
  if (globalHdpePressureRating) {
    const pn = Number(globalHdpePressureRating);
    if (Number.isFinite(pn) && pn > 0) return pn;
  }
  const pnFromSdr = pnClassForSdr(sdr, "PE100");
  return pnFromSdr ?? null;
};

// HDPE dim resolver — when an HDPE entry's calculation block lacks
// OD / WT (the backend's calc service is steel-only and skips HDPE
// entries), look the values up from the canonical PE100 table in
// @annix/product-data/hdpe so the BOQ can still populate Weld(m),
// Int m², Ext m² columns. Falls back to the formula `WT = OD/SDR`
// when the (DN, SDR) combo isn't in the table.
//
// SDR is derived in priority order:
//   1. entry.specs.hdpeSdr        — per-row override
//   2. globalHdpeSdr              — wizard-level setting
//   3. selectSdrForPressure(PN)   — when only PN is known
//   4. DEFAULT_HDPE_SDR (= 11)    — PN16/SDR11 mining default
export const resolveHdpeDims = (
  nb: number,
  entry: any,
  globalHdpeSdr: number | string | null | undefined,
  globalHdpePressureRating: number | string | null | undefined,
): { od: number; wt: number; sdr: SdrValue } => {
  const rawEntrySdr = entry.specs?.hdpeSdr;
  const pnNumber = globalHdpePressureRating ? Number(globalHdpePressureRating) : null;
  const sdrFromPn = pnNumber ? selectSdrForPressure(pnNumber, "PE100") : null;
  const sdrCandidate = rawEntrySdr || globalHdpeSdr || sdrFromPn || DEFAULT_HDPE_SDR;
  const sdr = Number(sdrCandidate) as SdrValue;
  const dims = hdpePipeDimensions(nb as HdpeNominalSize, sdr, "PE100");
  return { od: dims.odMm, wt: dims.wallMm, sdr };
};

// Compute per-row pipe weight when the entry's calculation block is
// empty (typical for Nix-extracted items where Step 2's auto-calc
// never fired). Uses the same hollow-cylinder formula as the steel
// calc but with the right density constant per material. For HDPE,
// the wall thickness is derived from SDR (WT = OD/SDR); the customer
// can still override by setting an explicit WT on the entry.
export const fallbackPipeWeight = (
  entry: any,
  nb: number,
  pipeLength: number,
  pipeQty: number,
  globalHdpeSdr: number | string | null | undefined,
): number => {
  const cachedWeight = entry.calculation?.totalPipeWeight;
  if (cachedWeight) return cachedWeight;

  const rawMaterialType = entry.materialType;
  const materialType = rawMaterialType || "steel";
  const productKey: keyof typeof PIPE_WEIGHT_K_BY_PRODUCT_TYPE =
    materialType === "hdpe" ? "hdpe" : materialType === "pvc" ? "pvc" : "steel";
  const k = PIPE_WEIGHT_K_BY_PRODUCT_TYPE[productKey];

  const rawOutsideDiameter = entry.specs?.outsideDiameterMm;
  let od = rawOutsideDiameter || nb;
  let wt = entry.specs?.wallThicknessMm;

  if (productKey === "hdpe") {
    const sdr = globalHdpeSdr || DEFAULT_HDPE_SDR;
    // For HDPE the customer-facing dimension is OD = nominalBoreMm.
    const rawNb = entry.specs?.nominalBoreMm;
    od = rawNb || od;
    if (!wt) wt = od / Number(sdr);
  } else if (!wt) {
    // No WT and no schedule lookup — give up rather than report a
    // misleading 0kg. Returning 0 here keeps the existing UX.
    return 0;
  }

  const perMetre = (od - wt) * wt * k;
  // For Nix-extracted entries the unit is often metres of total
  // pipe (quantityType === "total_length"), in which case
  // entry.specs.quantityValue IS the total length and multiplying
  // by pipeLength would over-count. Fall back to pipeLength × qty
  // for number_of_pipes mode.
  const rawQuantityType = entry.specs?.quantityType;
  const rawSpecsQuantityValue = entry.specs?.quantityValue;
  const totalLength =
    rawQuantityType === "total_length"
      ? rawSpecsQuantityValue || pipeLength * pipeQty
      : pipeLength * pipeQty;
  return perMetre * totalLength;
};

// Per-BEND weight (no qty multiplier — caller multiplies by qty when
// accumulating into a consolidated row). Models a bend as an arc of
// pipe — arc length = bendRadius × angle (in radians) — times the
// per-metre pipe weight for the material. Same density constant per
// material as fallbackPipeWeight. Doesn't account for tangent
// extensions; those add a small fraction of a pipe length.
export const fallbackBendWeight = (
  entry: any,
  nb: number,
  globalHdpeSdr: number | string | null | undefined,
): number => {
  const cachedTotalWeight = entry.calculation?.totalWeight;
  const cachedBendWeight = entry.calculation?.bendWeight;
  if (cachedTotalWeight) return cachedTotalWeight;
  if (cachedBendWeight) return cachedBendWeight;

  const rawMaterialType = entry.materialType;
  const materialType = rawMaterialType || "steel";
  const productKey: keyof typeof PIPE_WEIGHT_K_BY_PRODUCT_TYPE =
    materialType === "hdpe" ? "hdpe" : materialType === "pvc" ? "pvc" : "steel";
  const k = PIPE_WEIGHT_K_BY_PRODUCT_TYPE[productKey];

  const rawOutsideDiameter = entry.specs?.outsideDiameterMm;
  const od = rawOutsideDiameter || nb;
  let wt = entry.specs?.wallThicknessMm;
  if (productKey === "hdpe" && !wt) {
    const sdr = globalHdpeSdr || DEFAULT_HDPE_SDR;
    wt = od / Number(sdr);
  } else if (!wt) {
    return 0;
  }

  const rawBendDegrees = entry.specs?.bendDegrees;
  const angleDeg = rawBendDegrees || 90;
  const rawBendRadiusType = entry.specs?.bendType;
  const radiusFactor = parseFloat((rawBendRadiusType || "1.5D").replace("D", "")) || 1.5;
  const bendRadiusMetres = (nb * radiusFactor) / 1000;
  const arcLength = bendRadiusMetres * ((angleDeg * Math.PI) / 180);

  const perMetre = (od - wt) * wt * k;
  return perMetre * arcLength;
};

// Per-FITTING weight (no qty multiplier — caller multiplies by qty
// when accumulating). For tees and reducers the dominant mass is
// the pipe-equivalent body — tee approx = run length + branch
// length × per-metre. For reducers we average run + branch ODs.
// Crude but consistent with the bend approach and far better than
// reporting 0kg.
export const fallbackFittingWeight = (
  entry: any,
  nb: number,
  branchNb: number,
  globalHdpeSdr: number | string | null | undefined,
): number => {
  const cachedFittingWeight = entry.calculation?.fittingWeight;
  const cachedTotalWeight = entry.calculation?.totalWeight;
  if (cachedFittingWeight) return cachedFittingWeight;
  if (cachedTotalWeight) return cachedTotalWeight;

  const rawMaterialType = entry.materialType;
  const materialType = rawMaterialType || "steel";
  const productKey: keyof typeof PIPE_WEIGHT_K_BY_PRODUCT_TYPE =
    materialType === "hdpe" ? "hdpe" : materialType === "pvc" ? "pvc" : "steel";
  const k = PIPE_WEIGHT_K_BY_PRODUCT_TYPE[productKey];

  const od = nb;
  const branchOd = branchNb || nb;
  let wt = entry.specs?.wallThicknessMm;
  if (productKey === "hdpe" && !wt) {
    const sdr = globalHdpeSdr || DEFAULT_HDPE_SDR;
    wt = od / Number(sdr);
  } else if (!wt) {
    return 0;
  }

  // Run length: 2 × OD as a rule of thumb for an equal tee body
  // length. Branch length: OD as a single branch nipple.
  const runLengthM = (2 * od) / 1000;
  const branchLengthM = branchOd / 1000;
  const perMetreRun = (od - wt) * wt * k;
  const perMetreBranch = (branchOd - wt) * wt * k;
  return perMetreRun * runLengthM + perMetreBranch * branchLengthM;
};
