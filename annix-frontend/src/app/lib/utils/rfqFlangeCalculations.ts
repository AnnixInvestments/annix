import { blankFlangeWeight, flangeWeight, sansBlankFlangeWeight } from "@/app/lib/query/hooks";

export type FittingClass = "STD" | "XH" | "XXH" | "";

interface FlangeConfigSpecs {
  flangeStandardId?: number;
  flangePressureClassId?: number;
  flangeTypeCode?: string;
}

interface FlangeConfigMasterData {
  flangeStandards?: Array<{ id: number; code: string }>;
  pressureClasses?: Array<{ id: number; designation: string }>;
}

export interface ResolvedFlangeConfig {
  flangeStandardId: number | undefined;
  flangePressureClassId: number | undefined;
  flangeStandardCode: string;
  pressureClassDesignation: string;
  flangeTypeCode: string;
}

/**
 * Resolve the flange standard / pressure class / type configuration for a
 * single RFQ entry, falling back from item-level `specs` to global `globalSpecs`
 * and looking up the corresponding code/designation strings from `masterData`.
 *
 * All string return fields fall back to "" so callers can safely pass them
 * straight into `flangeWeight()` and similar APIs that expect non-nullable
 * strings (the lookup just returns no match for the empty string case).
 *
 * Extracted from BendForm / FittingForm / StraightPipeForm where this 10-line
 * resolution chain appeared at 4 sites. Pure function, no side effects.
 */
export function resolveFlangeConfig(
  specs: FlangeConfigSpecs,
  globalSpecs: FlangeConfigSpecs | null | undefined,
  masterData: FlangeConfigMasterData,
): ResolvedFlangeConfig {
  const flangeStandardId = specs.flangeStandardId || globalSpecs?.flangeStandardId;
  const flangePressureClassId = specs.flangePressureClassId || globalSpecs?.flangePressureClassId;
  const flangeTypeCode = specs.flangeTypeCode || globalSpecs?.flangeTypeCode || "";

  const flangeStandard = masterData.flangeStandards?.find((s) => s.id === flangeStandardId);
  const flangeStandardCode = flangeStandard?.code || "";

  const pressureClass = masterData.pressureClasses?.find((p) => p.id === flangePressureClassId);
  const pressureClassDesignation = pressureClass?.designation || "";

  return {
    flangeStandardId,
    flangePressureClassId,
    flangeStandardCode,
    pressureClassDesignation,
    flangeTypeCode,
  };
}

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
 * Calculate the per-unit flange weight, returning a fallback if either the
 * nominal bore or pressure class designation is missing.
 *
 * Extracted from BendForm / FittingForm / StraightPipeForm where this 8-line
 * `bore && pressureClass ? flangeWeight(...) : 0` pattern appeared 6+ times.
 *
 * The optional `fallback` parameter exists because BendForm and StraightPipeForm
 * fall back to `entry.calculation.flangeWeightPerUnit` for the main flange,
 * not 0.
 */
export function flangeWeightOr(
  allWeights: Parameters<typeof flangeWeight>[0],
  nominalBoreMm: number | null | undefined,
  pressureClassDesignation: string,
  flangeStandardCode: string,
  flangeTypeCode: string,
  fallback = 0,
): number {
  if (!nominalBoreMm || !pressureClassDesignation) return fallback;
  return flangeWeight(
    allWeights,
    nominalBoreMm,
    pressureClassDesignation,
    flangeStandardCode,
    flangeTypeCode,
  );
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
