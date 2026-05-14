/**
 * HDPE fitting weight estimator (quoting-stage heuristic).
 *
 * Source: industry estimating practice as summarised by the Plastics
 * Pipe Institute / SANS ISO 4427 family of references:
 *
 *   fitting_weight = pipe_kg_per_m × equivalent_length_factor
 *
 * The equivalent length factor depends on fitting geometry. For
 * elbows / bends it's the centreline arc length; for tees and
 * reducers it's a multiple of OD that captures the body volume
 * + branch material. These factors are quoting estimates only —
 * accurate to roughly ±15% vs published manufacturer charts —
 * and exist to give the supplier a non-zero baseline weight to
 * quote against. They are NOT a substitute for the actual
 * datasheet weight of a specific molded / fabricated fitting.
 *
 * For each FittingType we encode a multiplier rule keyed to the
 * fitting's geometry. New fitting types just need an entry in
 * FITTING_LENGTH_FACTORS to slot in.
 */

const HDPE_DENSITY_KG_DM3 = 0.96;

/**
 * Per-fitting equivalent-length-factor model. The factor returns the
 * straight-pipe-equivalent length in metres for a given OD.
 *
 * - "od_multiple"  → length = mult × OD
 * - "arc_90"       → length = π/2 × bendRadiusMultiplier × OD
 * - "arc_45"       → length = π/4 × bendRadiusMultiplier × OD
 */
type FittingLengthRule =
  | { kind: "od_multiple"; mult: number }
  | { kind: "arc_90"; bendRadiusMult: number }
  | { kind: "arc_45"; bendRadiusMult: number };

const FITTING_LENGTH_FACTORS: Record<string, FittingLengthRule> = {
  // Tees: body length ~2× OD is the industry estimating standard for
  // moulded equal/short tees. Sweep / long-body tees get ~3× OD.
  EQUAL_TEE: { kind: "od_multiple", mult: 2.0 },
  UNEQUAL_TEE: { kind: "od_multiple", mult: 2.0 },
  SHORT_TEE: { kind: "od_multiple", mult: 1.8 },
  GUSSET_TEE: { kind: "od_multiple", mult: 2.2 },
  GUSSETTED_TEE: { kind: "od_multiple", mult: 2.2 },
  UNEQUAL_SHORT_TEE: { kind: "od_multiple", mult: 1.8 },
  UNEQUAL_GUSSET_TEE: { kind: "od_multiple", mult: 2.2 },
  SWEEP_TEE: { kind: "od_multiple", mult: 3.0 },
  LATERAL: { kind: "od_multiple", mult: 2.5 },
  SABS719_LATERAL: { kind: "od_multiple", mult: 2.5 },
  Y_PIECE: { kind: "od_multiple", mult: 2.5 },
  EQUAL_CROSS: { kind: "od_multiple", mult: 3.0 },
  UNEQUAL_CROSS: { kind: "od_multiple", mult: 3.0 },

  // Elbows / bends use the same arc-length formula as the bend calc:
  // arc = (radius_multiplier × OD) × θ_radians.
  ELBOW: { kind: "arc_90", bendRadiusMult: 1.0 },
  MEDIUM_RADIUS_BEND: { kind: "arc_90", bendRadiusMult: 1.5 },
  LONG_RADIUS_BEND: { kind: "arc_90", bendRadiusMult: 3.0 },
  SWEEP_ELBOW: { kind: "arc_90", bendRadiusMult: 1.5 },
  SWEEP_LONG_RADIUS: { kind: "arc_90", bendRadiusMult: 3.0 },
  SWEEP_MEDIUM_RADIUS: { kind: "arc_90", bendRadiusMult: 1.5 },
  OFFSET_BEND: { kind: "arc_45", bendRadiusMult: 1.5 },

  // Reducers — conical body, estimating length ~1.5× larger OD.
  CON_REDUCER: { kind: "od_multiple", mult: 1.5 },
  ECCENTRIC_REDUCER: { kind: "od_multiple", mult: 1.5 },

  // Specialty (duckfoot etc.) — generous default since the body
  // includes a 90° elbow plus a base plate; treat as "long elbow".
  DUCKFOOT_SHORT: { kind: "arc_90", bendRadiusMult: 1.5 },
  DUCKFOOT_GUSSETTED: { kind: "arc_90", bendRadiusMult: 2.0 },
};

/**
 * Default fall-back factor when the fittingType isn't in the lookup.
 * 2× OD lands between an elbow (~π/2 × 1.5 ≈ 2.36 × OD for a 90°
 * long-radius bend) and an equal tee (2× OD), so it's a neutral
 * middle-of-the-road guess.
 */
const DEFAULT_LENGTH_FACTOR: FittingLengthRule = { kind: "od_multiple", mult: 2.0 };

/**
 * HDPE pipe weight per metre using the standard hollow-cylinder
 * formula. Same as the pipe / bend branches in
 * RfqCalculationService — exposed here so the fitting calc can stay
 * self-contained.
 */
function hdpePipeKgPerMetre(odMm: number, sdr: number): number {
  const wallMm = odMm / sdr;
  return (Math.PI * wallMm * (odMm - wallMm) * HDPE_DENSITY_KG_DM3) / 1000;
}

/**
 * Estimate the weight (kg) of a single HDPE fitting.
 *
 * Inputs:
 *   nominalDiameterMm — fitting body OD in mm
 *   fittingType       — string from FittingType enum; falls through
 *                       to a neutral default if unknown
 *   hdpeSdr           — Standard Dimension Ratio; defaults to 11
 *                       (PE100 PN16) when missing
 *
 * Returns 0 when nominalDiameterMm is invalid (caller should treat
 * 0 as "couldn't estimate" and decide whether to surface a warning).
 */
export function hdpeFittingWeightKg(
  nominalDiameterMm: number | undefined,
  fittingType: string | undefined,
  hdpeSdr: number | undefined,
  quantityValue?: number,
): number {
  if (!nominalDiameterMm || nominalDiameterMm <= 0) return 0;
  const sdr = hdpeSdr && hdpeSdr > 0 ? hdpeSdr : 11;
  const kgPerM = hdpePipeKgPerMetre(nominalDiameterMm, sdr);

  const rule =
    (fittingType ? FITTING_LENGTH_FACTORS[fittingType] : undefined) ?? DEFAULT_LENGTH_FACTOR;

  let equivalentLengthM: number;
  switch (rule.kind) {
    case "od_multiple":
      equivalentLengthM = (rule.mult * nominalDiameterMm) / 1000;
      break;
    case "arc_90":
      // 90° arc length = (π/2) × bend_radius. bend_radius is a
      // multiple of OD; expressed in mm here then divided to m.
      equivalentLengthM = ((Math.PI / 2) * rule.bendRadiusMult * nominalDiameterMm) / 1000;
      break;
    case "arc_45":
      equivalentLengthM = ((Math.PI / 4) * rule.bendRadiusMult * nominalDiameterMm) / 1000;
      break;
  }

  const perUnit = kgPerM * equivalentLengthM;
  const qty = quantityValue && quantityValue > 0 ? quantityValue : 1;
  return Math.round(perUnit * qty * 100) / 100;
}
