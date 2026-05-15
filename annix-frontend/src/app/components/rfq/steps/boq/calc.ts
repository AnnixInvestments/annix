import {
  type HdpeNominalSize,
  hdpeEndCapLength,
  pipeDimensions as hdpePipeDimensions,
  lateralDimensions,
  pnClassForSdr,
  type SdrValue,
  selectSdrForPressure,
} from "@annix/product-data/hdpe";
import { DEFAULT_HDPE_SDR, PIPE_WEIGHT_K_BY_PRODUCT_TYPE } from "./constants";

// Parse a wall thickness in millimetres out of a free-text description.
// Recognises the variants Nix-extracted BOQs commonly use:
//   "8mm wall thickness", "wall thickness of 8 mm", "8mm WT",
//   "WT 8mm", "8 mm w/t". Returns undefined when nothing matches.
// Used by the fitting / misc / bend fallback paths to recover wall
// thickness when the structured spec field wasn't populated upstream —
// without this, every steel fitting that came through the Nix misc
// fallback would persist at 0 kg even though the description clearly
// states the wall.
const parseWallThicknessFromDescription = (description: string): number | undefined => {
  const patterns = [
    /(\d+(?:\.\d+)?)\s*mm\s*wall\s*thickness/i,
    /wall\s*thickness\s*(?:of\s*)?(\d+(?:\.\d+)?)\s*mm/i,
    /(\d+(?:\.\d+)?)\s*mm\s*W\.?T\.?/i,
    /\bWT\s*(\d+(?:\.\d+)?)\s*mm/i,
    /(\d+(?:\.\d+)?)\s*mm\s*w\/t/i,
  ];
  for (const p of patterns) {
    const m = description.match(p);
    if (m) {
      const v = Number(m[1]);
      if (v > 0 && v < 100) return v;
    }
  }
  return undefined;
};

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
    const rawDescription = entry.description;
    wt = rawDescription ? parseWallThicknessFromDescription(rawDescription) : undefined;
    if (!wt) return 0;
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
    // Steel/PVC fitting with no structured wt — try the description
    // ("8mm wall thickness" etc.) before giving up.
    const rawDescription = entry.description;
    wt = rawDescription ? parseWallThicknessFromDescription(rawDescription) : undefined;
    if (!wt) return 0;
  }

  // Run length: 2 × OD as a rule of thumb for an equal tee body
  // length. Branch length: OD as a single branch nipple.
  const runLengthM = (2 * od) / 1000;
  const branchLengthM = branchOd / 1000;
  const perMetreRun = (od - wt) * wt * k;
  const perMetreBranch = (branchOd - wt) * wt * k;
  return perMetreRun * runLengthM + perMetreBranch * branchLengthM;
};

// Per-MISC-ITEM weight (no qty multiplier — caller multiplies by qty
// when accumulating). Misc items are Nix-extracted rows that didn't
// match a structural itemType — end caps, pipe boots, puddle pipes,
// laterals, UPVC bends, and steel-other off-cuts that fall through
// the wizard converter into the catch-all "misc" bucket. They show
// up in the BOQ's HDPE-Other / PVC-Other / Steel-Other sections;
// without this fallback those sections all display 0 kg even though
// we know the geometry. Each kind has a different volume estimate:
//
//   end_cap     — short stub-end fitting, length from end-cap table
//   pipe_boot   — short HDPE collar + SS clamp + neoprene seal
//   puddle_pipe — ~1m pipe section with backing flange
//   lateral     — body length (run F-F) + branch length from
//                 lateralDimensions catalogue
//   bend (UPVC) — toroidal-arc model: kgPerM × π × radius × angle
//
// Returns 0 when the kind isn't recognised — supplier sees the row
// at 0 kg, same as before, but now everything we CAN compute shows.
export const fallbackMiscWeight = (
  entry: any,
  description: string,
  productType: string | undefined,
  globalHdpeSdr: number | string | null | undefined,
): number => {
  const descLower = description.toLowerCase();

  const rawSpecsNb = entry.specs?.nominalBoreMm;
  const specsDn = rawSpecsNb ? Number(rawSpecsNb) : null;
  const dnPrefixMatch = description.match(/(?:DN|OD)\s*(\d{2,4})/i);
  const dnDiameterMatch = description.match(/(\d{2,4})\s*mm\s*(?:diameter|dia\.?|Ø)/i);
  const regexDn = dnPrefixMatch
    ? Number(dnPrefixMatch[1])
    : dnDiameterMatch
      ? Number(dnDiameterMatch[1])
      : null;
  const dn = specsDn || regexDn;
  if (!dn || !Number.isFinite(dn)) return 0;

  // Pick density constant. HDPE for hdpe; PVC for pvc/upvc; steel
  // covers the residual steel-other category.
  const productKey: keyof typeof PIPE_WEIGHT_K_BY_PRODUCT_TYPE =
    productType === "hdpe"
      ? "hdpe"
      : productType === "pvc" || productType === "upvc"
        ? "pvc"
        : "steel";
  const k = PIPE_WEIGHT_K_BY_PRODUCT_TYPE[productKey];

  // Wall thickness: per-entry → description parse → SDR-derived →
  // 0 (caller bails). The description-parse step recovers steel rows
  // whose only stated wall thickness is in the free-text ("8mm wall
  // thickness") — common for rubber-lined mild steel rows that flow
  // through the misc bucket.
  let wt = entry.specs?.wallThicknessMm ? Number(entry.specs.wallThicknessMm) : undefined;
  if (!wt) {
    wt = parseWallThicknessFromDescription(description);
  }
  if (!wt && productKey === "hdpe") {
    const sdr = globalHdpeSdr || DEFAULT_HDPE_SDR;
    wt = dn / Number(sdr);
  }
  if (!wt && productKey === "pvc") {
    // Default PVC SDR 17 (Class 12) when nothing else is known —
    // most common pressure class in mining drainage.
    wt = dn / 17;
  }
  if (!wt) return 0;

  const perMetre = (dn - wt) * wt * k;

  // Classification regexes — order matters: more specific first.
  const isUpvcBend = /\b(upvc|pvc)\b/i.test(descLower) && /\b(bend|elbow|deg)\b/i.test(descLower);
  const isLateral = /\blaterals?\b/i.test(descLower);
  const isEndCap = /\bend[\s-]?caps?\b/i.test(descLower);
  const isPipeBoot = /\bpipe\s*boots?\b/i.test(descLower);
  const isPuddlePipe = /\bpuddle\s*pipes?\b/i.test(descLower);

  if (isUpvcBend) {
    // Toroidal-arc bend: arcLen = π × radiusFactor × DN × angle/180
    // Read bend angle from description ("22.5-degree", "45 deg",
    // "90°"). Default to 90 when nothing matches. Radius factor 1.5
    // is the SABS-standard mining default for slip-over PVC bends.
    const angleMatch = description.match(/(\d+(?:\.\d+)?)\s*(?:°|deg)/i);
    const angleDeg = angleMatch ? Number(angleMatch[1]) : 90;
    const radiusFactor = 1.5;
    const arcLengthM = (Math.PI * (angleDeg / 180) * radiusFactor * dn) / 1000;
    return perMetre * arcLengthM;
  }
  if (isLateral) {
    // Use catalogued lateral dimensions when available (HDPE 45°),
    // else fall back to 2.5 × OD as eq length.
    const angleMatch = description.match(/\b(\d+(?:\.\d+)?)\s*(?:°|deg)/i);
    const angleDeg = angleMatch ? Number(angleMatch[1]) : 45;
    if (productKey === "hdpe") {
      const dims = lateralDimensions(angleDeg, dn);
      if (dims) {
        const runLenM = dims.runFaceToFaceMm / 1000;
        const branchLenM = dims.branchLengthMm / 1000;
        return perMetre * (runLenM + branchLenM);
      }
    }
    const eqLenM = (2.5 * dn) / 1000;
    return perMetre * eqLenM;
  }
  if (isEndCap) {
    // Use catalogued end-cap length (DN-specific stub-end length)
    // for HDPE; default to 0.8 × OD eq length otherwise.
    if (productKey === "hdpe") {
      const lengthMm = hdpeEndCapLength(dn);
      if (lengthMm) {
        return perMetre * (lengthMm / 1000);
      }
    }
    const eqLenM = (0.8 * dn) / 1000;
    return perMetre * eqLenM;
  }
  if (isPipeBoot) {
    // Short HDPE collar (~0.5 × OD) plus a stainless-steel clamp
    // mass that scales mildly with DN (clamps for DN250 are
    // typically ~1.5 kg, for DN100 ~0.4 kg). Approximate the
    // clamp/seal contribution as +0.005 × DN kg.
    const collarLenM = (0.5 * dn) / 1000;
    const clampKg = 0.005 * dn;
    return perMetre * collarLenM + clampKg;
  }
  if (isPuddlePipe) {
    // ~1m of pipe section + TWO SANS1123 flanges (one puddle, one
    // backing). Empirical fit to SANS 1123 Table 1000/3 plate-flange
    // masses (DN100=2.5kg, DN400=16kg, DN600=33kg) is roughly
    // DN^1.5/600 per flange, scaling more gently than DN².
    const pipeLenM = 1.0;
    const perFlangeKg = dn ** 1.5 / 600;
    return perMetre * pipeLenM + 2 * perFlangeKg;
  }
  // Steel-other (rubber-lined mild steel pipes) — typically the
  // description is for a straight pipe section. Read explicit
  // length from description ("up to 8 m", "9.144 m") or fall back
  // to DEFAULT_HDPE_SDR-equivalent (12 m).
  if (productKey === "steel") {
    const lengthMatch = description.match(/(\d+(?:\.\d+)?)\s*m\s*(?:length|long)?\b/i);
    const pipeLenM = lengthMatch ? Number(lengthMatch[1]) : 12;
    return perMetre * pipeLenM;
  }
  return 0;
};
