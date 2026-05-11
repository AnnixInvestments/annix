import type { PtRecommendationResult, ValidPressureClassInfo } from "@/app/lib/api/client";

// Extract the leading numeric value from a pressure-class designation
// (e.g. "PN16", "Class 150") for ordinal comparison. Used to decide
// whether a manual override is "higher" or "lower" than the auto-derived
// pressure class.
export const extractPressureNumeric = (designation: string | null | undefined): number => {
  if (!designation) return 0;
  const match = designation.match(/^(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
};

export interface PressureClassOverrideStatus {
  isOverride: boolean;
  isHigher: boolean;
  isLower: boolean;
}

export interface PressureClassRow {
  id: number;
  designation: string;
}

// Dedupe + sort `availablePressureClasses` for the dropdown:
// 1. Sort by leading numeric ascending (so 6/10/16/25 not 10/100/16),
//    falling back to designation locale-compare.
// 2. Strip "/digit" suffix from the designation to get a `displayValue`.
// 3. Dedupe by `displayValue` (first occurrence wins).
export const dedupSortPressureClassesByDisplay = <T extends PressureClassRow>(
  rows: T[],
): Array<T & { displayValue: string }> => {
  const sorted = [...rows].sort((a, b) => {
    const numA = extractPressureNumeric(a.designation);
    const numB = extractPressureNumeric(b.designation);
    if (numA !== numB) return numA - numB;
    const designationA = a.designation;
    const designationB = b.designation;
    return (designationA || "").localeCompare(designationB || "");
  });
  const seen = new Set<string>();
  return sorted
    .map((pc) => ({ ...pc, displayValue: pc.designation.replace(/\/\d+$/, "") }))
    .filter((pc) => {
      if (seen.has(pc.displayValue)) return false;
      seen.add(pc.displayValue);
      return true;
    });
};

// Sort pressure classes by leading numeric in descending order. Used as
// a fallback when no class is suitable for the working pressure — pick
// the highest as a last resort.
export const sortPressureClassesByNumericDesc = <T extends PressureClassRow>(rows: T[]): T[] =>
  [...rows].sort((a, b) => {
    const numA = extractPressureNumeric(a.designation);
    const numB = extractPressureNumeric(b.designation);
    return numB - numA;
  });

// Compare the currently-selected pressure class vs the auto-recommended
// pressure class and report whether the selection is an override and, if
// so, whether it is higher or lower than the auto-recommended class.
export const derivePressureClassOverrideStatus = (
  currentId: number | null | undefined,
  autoId: number | null,
  availablePressureClasses: PressureClassRow[] | null | undefined,
): PressureClassOverrideStatus => {
  if (!currentId || !autoId || currentId === autoId) {
    return { isOverride: false, isHigher: false, isLower: false };
  }
  const currentClass = availablePressureClasses?.find((pc) => pc.id === currentId);
  const autoClass = availablePressureClasses?.find((pc) => pc.id === autoId);
  if (!currentClass || !autoClass) {
    return { isOverride: true, isHigher: false, isLower: false };
  }
  const currentNumeric = extractPressureNumeric(currentClass.designation);
  const autoNumeric = extractPressureNumeric(autoClass.designation);
  return {
    isOverride: true,
    isHigher: currentNumeric > autoNumeric,
    isLower: currentNumeric < autoNumeric,
  };
};

// True when the currently-selected pressure class is present in the
// P-T-rating info map but flagged as not adequate for the working
// pressure / temperature combination.
export const isPressureClassUnsuitable = (
  currentId: number | null | undefined,
  pressureClassInfoMap: Map<number, ValidPressureClassInfo>,
): boolean => {
  if (!currentId) return false;
  const classInfo = pressureClassInfoMap.get(currentId);
  return classInfo ? !classInfo.isAdequate : false;
};

// True when there ARE valid pressure classes from the P-T engine but the
// currently-selected class has no entry in the info map — i.e. the user
// has selected a class for which we have no P-T data.
export const isPressureClassMissingPTData = (
  currentId: number | null | undefined,
  pressureClassInfoMap: Map<number, ValidPressureClassInfo>,
  ptRecommendations: Pick<PtRecommendationResult, "validPressureClasses"> | null | undefined,
): boolean => {
  if (!currentId || !ptRecommendations) return false;
  const classInfo = pressureClassInfoMap.get(currentId);
  return !classInfo && ptRecommendations.validPressureClasses.length > 0;
};

// Mining environments are typically high UV (outdoor). When a mine is
// selected, derive a default UV-exposure band from the ISO 12944 corrosion
// category; otherwise return null and let the user pick manually.
export const deriveMiningUvExposure = (
  mineSelected: boolean,
  iso12944: string | null,
): "High" | "Moderate" | null => {
  if (!mineSelected) return null;
  if (iso12944 === "C5" || iso12944 === "CX") return "High";
  if (iso12944 === "C3" || iso12944 === "C4") return "Moderate";
  if (iso12944 === "C1" || iso12944 === "C2") return "Moderate";
  return "High";
};

// Tailwind class set for an auto-filled field — emerald borders + bold
// text when the value came from upstream environmental data, vs. a
// neutral grey otherwise. Used by every auto-fillable input on the
// specifications step so behaviour stays consistent.
export const autoFilledClass = (isAutoFilled: boolean): string =>
  isAutoFilled
    ? "border-2 border-emerald-500 bg-emerald-50 text-emerald-900 font-semibold"
    : "border border-gray-300 text-gray-900";

// Map service-life selection to ISO 12944-5 durability code.
//   Short    -> L  (low durability, < 7 years)
//   Medium   -> M  (medium, 7–15 years)
//   Long     -> H  (high, 15–25 years)
//   Extended -> VH (very high, > 25 years)
export const serviceLifeToDurability = (
  serviceLife: string | null,
): "L" | "M" | "H" | "VH" | null => {
  switch (serviceLife) {
    case "Short":
      return "L";
    case "Medium":
      return "M";
    case "Long":
      return "H";
    case "Extended":
      return "VH";
    default:
      return null;
  }
};

// Derive a temperature-band category from a working-temperature value.
// Returns "Ambient" for the standard working range (-20 to +60 °C),
// "Elevated" for 60–120, "High" above 120. Null when no temperature
// is provided.
export const deriveTemperatureCategory = (tempC: number | null): string | null => {
  if (tempC == null) return null;
  if (tempC < -20 || tempC > 60) {
    if (tempC >= 60 && tempC <= 120) return "Elevated";
    if (tempC > 120 && tempC <= 200) return "High";
    if (tempC > 200) return "High";
    return "Ambient";
  }
  return "Ambient";
};
