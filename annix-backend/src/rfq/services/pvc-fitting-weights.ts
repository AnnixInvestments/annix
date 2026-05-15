/**
 * PVC (uPVC / Rigid PVC) fitting weight estimator. Parallel module
 * to hdpe-fitting-weights.ts — same quoting-stage heuristic of
 * pipe-kg/m × equivalent-length-factor, but with PVC density
 * (1.40 kg/dm³ vs HDPE's 0.96).
 *
 * Per the engineering references shared in chat (ISO 1452 family,
 * PIPA, ChatGPT, Grok): there's no universally accurate formula
 * for molded PVC fittings because geometry varies by manufacturer.
 * The equivalent-length-factor approach gets within ±15-20% of
 * datasheet values — accurate enough to drive RFQ baseline
 * weights for transport / costing / supplier quoting.
 *
 * For exact procurement weights the supplier should still cite the
 * manufacturer datasheet for the specific moulded fitting.
 */

const PVC_DENSITY_KG_DM3 = 1.4;

/**
 * Per-fitting equivalent-length-factor model. Same shape as the
 * HDPE module so callers can pick the matching one based on
 * materialType.
 */
type FittingLengthRule =
  | { kind: "od_multiple"; mult: number }
  | { kind: "arc_90"; bendRadiusMult: number }
  | { kind: "arc_45"; bendRadiusMult: number };

const FITTING_LENGTH_FACTORS: Record<string, FittingLengthRule> = {
  // PVC moulded tees have shorter bodies than HDPE fused tees —
  // industry estimating midpoint is ~1.5–2× OD. We pick 1.8× OD
  // as a slightly higher anchor than HDPE's short-tee value to
  // account for PVC's heavier socket bell ends.
  EQUAL_TEE: { kind: "od_multiple", mult: 1.8 },
  UNEQUAL_TEE: { kind: "od_multiple", mult: 1.8 },
  SHORT_TEE: { kind: "od_multiple", mult: 1.6 },
  GUSSET_TEE: { kind: "od_multiple", mult: 2.0 },
  GUSSETTED_TEE: { kind: "od_multiple", mult: 2.0 },
  UNEQUAL_SHORT_TEE: { kind: "od_multiple", mult: 1.6 },
  UNEQUAL_GUSSET_TEE: { kind: "od_multiple", mult: 2.0 },
  SWEEP_TEE: { kind: "od_multiple", mult: 2.5 },
  LATERAL: { kind: "od_multiple", mult: 2.2 },
  SABS719_LATERAL: { kind: "od_multiple", mult: 2.2 },
  Y_PIECE: { kind: "od_multiple", mult: 2.2 },
  EQUAL_CROSS: { kind: "od_multiple", mult: 2.5 },
  UNEQUAL_CROSS: { kind: "od_multiple", mult: 2.5 },

  // Elbows / bends. PVC moulded elbows are typically tighter
  // radius than HDPE fused bends — short-radius is standard.
  ELBOW: { kind: "arc_90", bendRadiusMult: 0.75 },
  MEDIUM_RADIUS_BEND: { kind: "arc_90", bendRadiusMult: 1.5 },
  LONG_RADIUS_BEND: { kind: "arc_90", bendRadiusMult: 3.0 },
  SWEEP_ELBOW: { kind: "arc_90", bendRadiusMult: 1.5 },
  SWEEP_LONG_RADIUS: { kind: "arc_90", bendRadiusMult: 3.0 },
  SWEEP_MEDIUM_RADIUS: { kind: "arc_90", bendRadiusMult: 1.5 },
  OFFSET_BEND: { kind: "arc_45", bendRadiusMult: 1.5 },

  // Reducers — moulded body ~1.2× larger OD for PVC (shorter than
  // HDPE fabricated reducers).
  CON_REDUCER: { kind: "od_multiple", mult: 1.2 },
  ECCENTRIC_REDUCER: { kind: "od_multiple", mult: 1.2 },

  // PVC duckfoot pieces — rare but spec'd in some drainage systems.
  DUCKFOOT_SHORT: { kind: "arc_90", bendRadiusMult: 1.5 },
  DUCKFOOT_GUSSETTED: { kind: "arc_90", bendRadiusMult: 2.0 },

  // End cap / stop end: short cap with solvent-weld socket. PVC end
  // caps are typically shorter than HDPE stub-ends (0.5× OD vs
  // 0.8× OD) because they're moulded as a thin disk with a socket
  // skirt rather than fabricated from pipe stock.
  END_CAP: { kind: "od_multiple", mult: 0.5 },

  // Pipe boot — uncommon in pure-PVC systems but possible in mixed
  // installations. 0.4× OD with caller-added clamp/seal mass.
  BOOT: { kind: "od_multiple", mult: 0.4 },

  // Puddle pipe: PVC puddle pieces are less common than HDPE but
  // occur in chemical / acid drainage systems. 3.5× OD eq length
  // captures ~1m of pipe + solvent-welded flange skirt.
  PUDDLE_PIPE: { kind: "od_multiple", mult: 3.5 },
};

const DEFAULT_LENGTH_FACTOR: FittingLengthRule = { kind: "od_multiple", mult: 1.8 };

function pvcPipeKgPerMetre(odMm: number, sdr: number): number {
  const wallMm = odMm / sdr;
  return (Math.PI * wallMm * (odMm - wallMm) * PVC_DENSITY_KG_DM3) / 1000;
}

/**
 * Estimate single-PVC-fitting weight (kg). Mirrors
 * hdpeFittingWeightKg's signature so callers can branch on
 * materialType cleanly.
 *
 * sdr fallback: SDR 21 (~PN10) is the most common PVC pressure
 * pipe rung in the SA market, so it's a reasonable default when
 * the entry didn't supply one. Wall thickness can come from
 * either SDR or a pressure-class translation — caller should
 * resolve to SDR upstream via pvcSdrFromPn / pvcPnFromPressureClass.
 */
export function pvcFittingWeightKg(
  nominalDiameterMm: number | undefined,
  fittingType: string | undefined,
  pvcSdr: number | undefined,
  quantityValue?: number,
): number {
  if (!nominalDiameterMm || nominalDiameterMm <= 0) return 0;
  const sdr = pvcSdr && pvcSdr > 0 ? pvcSdr : 21;
  const kgPerM = pvcPipeKgPerMetre(nominalDiameterMm, sdr);

  const rule =
    (fittingType ? FITTING_LENGTH_FACTORS[fittingType] : undefined) ?? DEFAULT_LENGTH_FACTOR;

  let equivalentLengthM: number;
  switch (rule.kind) {
    case "od_multiple":
      equivalentLengthM = (rule.mult * nominalDiameterMm) / 1000;
      break;
    case "arc_90":
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
