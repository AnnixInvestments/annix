/**
 * UK UCAS Tariff point mappings.
 *
 * Sources: UCAS Tariff tables corroborated via The Uni Guide + Complete
 * University Guide. A-Level mapping CONFIDENCE: HIGH (stable since the 2017
 * reform). IB and BTEC mappings CONFIDENCE: MEDIUM — verify against the
 * current-year UCAS Tariff before relying on intermediate values.
 *
 * IMPORTANT: many selective UK courses do NOT use the Tariff at all — they
 * state NAMED GRADES (e.g. "AAB including A in Mathematics"). So a UK
 * requirement may be either a TARIFF_SUM threshold OR a NAMED_GRADE_MATCH;
 * this table only powers the tariff path.
 */

export type ALevelGrade = "A*" | "A" | "B" | "C" | "D" | "E";

export const A_LEVEL_TARIFF: Record<ALevelGrade, number> = {
  "A*": 56,
  A: 48,
  B: 40,
  C: 32,
  D: 24,
  E: 16,
};

export type IbHigherGrade = 7 | 6 | 5 | 4 | 3;
export type IbStandardGrade = 7 | 6 | 5 | 4 | 3;

/** IB Higher Level per-subject tariff. CONFIDENCE: MEDIUM. */
export const IB_HL_TARIFF: Record<IbHigherGrade, number> = {
  7: 56,
  6: 48,
  5: 32,
  4: 24,
  3: 12,
};

/** IB Standard Level per-subject tariff. CONFIDENCE: MEDIUM. */
export const IB_SL_TARIFF: Record<IbStandardGrade, number> = {
  7: 28,
  6: 24,
  5: 16,
  4: 10,
  3: 6,
};

export type BtecGrade = "D*" | "D" | "M" | "P";

/** Single-unit BTEC grade tariff (one unit ≈ one A-Level). CONFIDENCE: MEDIUM. */
export const BTEC_SINGLE_TARIFF: Record<BtecGrade, number> = {
  "D*": 56,
  D: 48,
  M: 32,
  P: 16,
};

export function aLevelTariff(grade: ALevelGrade): number {
  return A_LEVEL_TARIFF[grade];
}

/** Sum the tariff for a set of A-Level grades (the typical 3-subject offer). */
export function sumALevelTariff(grades: readonly ALevelGrade[]): number {
  return grades.reduce((total, grade) => total + A_LEVEL_TARIFF[grade], 0);
}
