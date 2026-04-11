import { blankFlangeWeight, sansBlankFlangeWeight } from "@/app/lib/query/hooks";

export type FittingClass = "STD" | "XH" | "XXH" | "";

/**
 * Determine the fitting class (STD / XH / XXH) from a pipe schedule string.
 *
 * Schedule mapping (case-insensitive):
 *   - STD, 40, Sch40                       -> STD
 *   - XS, XH, 80, Sch80                    -> XH
 *   - XXS, XXH, 160, Sch160                -> XXH
 *   - anything else                        -> ""
 *
 * Extracted from BendForm / FittingForm / StraightPipeForm where this
 * pattern was duplicated 4 times. Pure function, no side effects.
 */
export function scheduleToFittingClass(schedule: string): FittingClass {
  const scheduleUpper = schedule.toUpperCase();
  const isStd = scheduleUpper.includes("40") || scheduleUpper === "STD";
  const isXh = scheduleUpper.includes("80") || scheduleUpper === "XS" || scheduleUpper === "XH";
  const isXxh = scheduleUpper.includes("160") || scheduleUpper === "XXS" || scheduleUpper === "XXH";

  if (isXxh) return "XXH";
  if (isXh) return "XH";
  if (isStd) return "STD";
  return "";
}

/**
 * Calculate the per-unit blank flange weight, branching between SABS 1123
 * and other standards.
 *
 * Returns 0 if either nominalBoreMm or pressureClassDesignation is missing.
 *
 * Extracted from BendForm / FittingForm / StraightPipeForm where this pattern
 * appeared 6+ times across the 3 forms. The branching is on the flange
 * standard code containing "SABS 1123" or "SANS 1123".
 */
export function calculateBlankFlangeWeight(
  allWeights: Parameters<typeof blankFlangeWeight>[0],
  nominalBoreMm: number | null | undefined,
  pressureClassDesignation: string | null | undefined,
  flangeStandardCode: string,
): number {
  if (!nominalBoreMm || !pressureClassDesignation) return 0;

  const isSans1123 =
    flangeStandardCode.includes("SABS 1123") || flangeStandardCode.includes("SANS 1123");

  return isSans1123
    ? sansBlankFlangeWeight(allWeights, nominalBoreMm, pressureClassDesignation)
    : blankFlangeWeight(allWeights, nominalBoreMm, pressureClassDesignation);
}
