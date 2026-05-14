/**
 * HDPE SDR ↔ PN reference (ISO 4427 / EN 12201 / SANS ISO 4427 family).
 *
 * The relationship is fixed by material grade and design coefficient:
 *
 *   PN = (20 × MRS) / (C × (SDR − 1))
 *
 * where MRS is the material's Minimum Required Strength in MPa and C is
 * the design coefficient (commonly 1.25 for water at 20°C in ISO systems).
 *
 *   PE100 (MRS 10):  PN = 200 / (1.25 × (SDR − 1)) = 160 / (SDR − 1)
 *   PE80  (MRS 8):   PN =  160 / (1.25 × (SDR − 1)) = 128 / (SDR − 1)
 *   PE63  (MRS 6.3): PN = 126 / (1.25 × (SDR − 1)) =  100.8 / (SDR − 1)
 *
 * Standard SDR/PN points published in ISO 4427-2 for PE100 (water, 20°C):
 *
 *   SDR  7.4  → PN 25
 *   SDR  9    → PN 20
 *   SDR 11    → PN 16
 *   SDR 13.6  → PN 12.5
 *   SDR 17    → PN 10
 *   SDR 21    → PN 8
 *   SDR 26    → PN 6.3
 *   SDR 33    → PN ~5
 *   SDR 41    → PN ~4
 *
 * For PE4710 (the North-American equivalent, sized by DR rather than SDR)
 * pressure ratings are in psi rather than bar — kept here as a separate
 * lookup so callers don't accidentally mix unit systems.
 */

/** Material grade → MRS (MPa). Add new grades here as the product line expands. */
const HDPE_GRADE_MRS_MPA: Record<string, number> = {
  PE100: 10,
  PE80: 8,
  PE63: 6.3,
};

const DEFAULT_DESIGN_COEFFICIENT = 1.25;

/**
 * Pre-computed ISO 4427 PE100 SDR → PN table. We honour these as the
 * authoritative values (matches every published manufacturer chart) and
 * only fall back to the formula for non-standard SDRs.
 */
const PE100_SDR_TO_PN_BAR: ReadonlyArray<{ sdr: number; pn: number }> = [
  { sdr: 7.4, pn: 25 },
  { sdr: 9, pn: 20 },
  { sdr: 11, pn: 16 },
  { sdr: 13.6, pn: 12.5 },
  { sdr: 17, pn: 10 },
  { sdr: 21, pn: 8 },
  { sdr: 26, pn: 6.3 },
  { sdr: 33, pn: 5 },
  { sdr: 41, pn: 4 },
];

/**
 * Derive PN (bar) from SDR + PE grade.
 *
 * For PE100 we prefer the published ISO 4427 table (handles SDR 26 → 6.3
 * which the raw formula would round to 6.4). For other grades or
 * non-standard SDRs we fall back to the formula PN = (20 × MRS) /
 * (C × (SDR − 1)).
 *
 * Returns undefined when:
 *  - sdr is missing / non-positive
 *  - sdr is ≤ 1 (formula divides by zero)
 *  - peGrade isn't in the known grades table
 *
 * Callers that already have a hdpePnRating from the user should NOT call
 * this — only use it to fill the gap. The persisted value should win over
 * the derived value to preserve customer intent.
 */
export function hdpePnFromSdr(sdr?: number, peGrade?: string): number | undefined {
  if (!sdr || sdr <= 1) return undefined;
  const grade = peGrade ?? "PE100";
  const mrs = HDPE_GRADE_MRS_MPA[grade];
  if (!mrs) return undefined;

  if (grade === "PE100") {
    // Match the published table exactly on standard rungs.
    const match = PE100_SDR_TO_PN_BAR.find((row) => row.sdr === sdr);
    if (match) return match.pn;
  }

  const pn = (20 * mrs) / (DEFAULT_DESIGN_COEFFICIENT * (sdr - 1));
  // Round to one decimal — published ratings are quoted to at most one
  // (PN 12.5, PN 6.3); higher precision is meaningless given SDR
  // tolerances are themselves ±a few percent.
  return Math.round(pn * 10) / 10;
}

/**
 * Inverse lookup — derive SDR from PN + PE grade. Useful when an RFQ
 * line carries a stated pressure rating ("PE100 PN16") but no explicit
 * SDR. Returns undefined when no standard SDR matches within rounding.
 */
export function hdpeSdrFromPn(pn?: number, peGrade?: string): number | undefined {
  if (!pn || pn <= 0) return undefined;
  const grade = peGrade ?? "PE100";

  if (grade === "PE100") {
    const match = PE100_SDR_TO_PN_BAR.find((row) => row.pn === pn);
    if (match) return match.sdr;
  }

  const mrs = HDPE_GRADE_MRS_MPA[grade];
  if (!mrs) return undefined;
  const sdr = (20 * mrs) / (DEFAULT_DESIGN_COEFFICIENT * pn) + 1;
  return Math.round(sdr * 10) / 10;
}

/**
 * PE100 temperature derating factors (ISO 4427-2 Annex / PIPA — typical
 * 50-year service life, water service). Below 20°C we treat the factor
 * as 1.0 — some manufacturers publish a slight uprating but it's small
 * enough that ignoring it errs on the conservative side. Above 60°C the
 * material is outside its standard service window; we cap there and
 * leave the caller to either accept the very-low derated rating or use
 * a special compound.
 *
 * Anchor points (ISO/manufacturer-cited typical values, picking the
 * lower bound of the manufacturer-table ranges so RFQ ratings stay
 * conservative for procurement):
 *
 *   20°C → 1.00
 *   30°C → 0.92
 *   35°C → 0.85
 *   40°C → 0.77
 *   45°C → 0.68
 *   50°C → 0.58
 *   55°C → 0.50
 *   60°C → 0.45
 */
const PE100_DERATING_TABLE: ReadonlyArray<{ tempC: number; factor: number }> = [
  { tempC: 20, factor: 1.0 },
  { tempC: 30, factor: 0.92 },
  { tempC: 35, factor: 0.85 },
  { tempC: 40, factor: 0.77 },
  { tempC: 45, factor: 0.68 },
  { tempC: 50, factor: 0.58 },
  { tempC: 55, factor: 0.5 },
  { tempC: 60, factor: 0.45 },
];

/**
 * Return the temperature derating factor for PE100 at the given
 * operating temperature in Celsius. Linearly interpolates between
 * published anchor points (above). Clamps:
 *  - tempC ≤ 20      → 1.00  (no derating below the rating reference)
 *  - tempC ≥ 60      → 0.45  (boundary of standard PE100 service)
 *
 * Higher-temperature applications need a different compound and are
 * outside the scope of this lookup — caller is responsible for raising
 * a warning if they exceed 60°C in service.
 */
export function hdpeDeratingFactor(tempC?: number, peGrade?: string): number {
  if (tempC == null || tempC <= 20) return 1.0;
  // Only PE100 is tabulated here; PE80 / PE63 share roughly the same
  // shape — fall back to PE100's curve so we still return a sensible
  // number rather than 1.0 for grades we don't yet have a published
  // table for. The peGrade arg is reserved for future grade-specific
  // tables.
  void peGrade;
  if (tempC >= 60) return PE100_DERATING_TABLE[PE100_DERATING_TABLE.length - 1].factor;

  for (let i = 0; i < PE100_DERATING_TABLE.length - 1; i++) {
    const lo = PE100_DERATING_TABLE[i];
    const hi = PE100_DERATING_TABLE[i + 1];
    if (tempC >= lo.tempC && tempC <= hi.tempC) {
      const t = (tempC - lo.tempC) / (hi.tempC - lo.tempC);
      const factor = lo.factor + t * (hi.factor - lo.factor);
      return Math.round(factor * 100) / 100;
    }
  }
  return 1.0;
}

/**
 * Derate a PN rating to the operating temperature. Returns undefined
 * when basePn is missing so the column can stay NULL in the DB rather
 * than fabricate a number.
 */
export function hdpeDeratedPn(
  basePn?: number,
  tempC?: number,
  peGrade?: string,
): number | undefined {
  if (basePn == null || basePn <= 0) return undefined;
  const factor = hdpeDeratingFactor(tempC, peGrade);
  return Math.round(basePn * factor * 10) / 10;
}
