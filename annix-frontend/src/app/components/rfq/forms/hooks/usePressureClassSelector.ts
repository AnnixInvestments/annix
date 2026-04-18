import { useMemo } from "react";
import {
  availablePressureClasses,
  type PressureClass,
  recommendedPressureClassId,
} from "@/app/lib/config/rfq/pipeEndOptions";
import {
  type PressureClassValidationResult,
  validatePressureClass,
} from "@/app/lib/utils/pressureClassValidation";

interface PressureClassSelectorInput {
  workingPressureBar: number | undefined;
  flangeStandardId: number | undefined;
  flangeStandardCode: string;
  flangeTypeCode: string | undefined;
  currentPressureClassId: number | undefined;
  pressureClassesByStandard: Record<number, PressureClass[]>;
  allPressureClasses: PressureClass[];
  pressureClassDesignation: string | undefined;
}

interface BarRatedClass extends PressureClass {
  barRating: number;
}

interface PressureClassSelectorResult {
  availableClasses: PressureClass[];
  recommendedClassId: number | null;
  validation: PressureClassValidationResult;
  classesWithRatings: BarRatedClass[];
  margin: number | null;
}

function extractBarRating(designation: string, flangeStandardCode: string): number {
  const codeUpper = flangeStandardCode.toUpperCase();
  const isSabs1123 =
    (codeUpper.includes("SABS") || codeUpper.includes("SANS")) && codeUpper.includes("1123");
  const isBs4504 = codeUpper.includes("BS") && codeUpper.includes("4504");

  const pnMatch = designation.match(/PN\s*(\d+)/i);
  if (pnMatch) {
    return parseInt(pnMatch[1], 10);
  }
  if (isSabs1123) {
    const kpaMatch = designation.match(/^(\d+)/);
    if (kpaMatch) {
      return parseInt(kpaMatch[1], 10) / 100;
    }
  }
  if (isBs4504) {
    const numMatch = designation.match(/^(\d+)/);
    if (numMatch) {
      return parseInt(numMatch[1], 10);
    }
  }
  const numMatch = designation.match(/^(\d+)/);
  if (numMatch) {
    const num = parseInt(numMatch[1], 10);
    return num >= 500 ? num / 100 : num;
  }
  return 0;
}

export function usePressureClassSelector(
  input: PressureClassSelectorInput,
): PressureClassSelectorResult {
  const {
    workingPressureBar,
    flangeStandardId,
    flangeStandardCode,
    flangeTypeCode,
    currentPressureClassId,
    pressureClassesByStandard,
    allPressureClasses,
    pressureClassDesignation,
  } = input;

  const classes = useMemo(
    () => availablePressureClasses(flangeStandardId, pressureClassesByStandard, allPressureClasses),
    [flangeStandardId, pressureClassesByStandard, allPressureClasses],
  );

  const classesWithRatings = useMemo(
    () =>
      classes
        .map((pc) => {
          const rawDesignation = pc.designation;
          const designation = rawDesignation || "";
          return { ...pc, barRating: extractBarRating(designation, flangeStandardCode) };
        })
        .filter((pc) => pc.barRating > 0)
        .sort((a, b) => a.barRating - b.barRating),
    [classes, flangeStandardCode],
  );

  const recommendedClassId = useMemo(() => {
    const pressure = workingPressureBar || 0;
    if (pressure <= 0 || classes.length === 0) {
      return currentPressureClassId || null;
    }
    return (
      recommendedPressureClassId(pressure, classes, flangeStandardCode, flangeTypeCode) ||
      currentPressureClassId ||
      null
    );
  }, [workingPressureBar, classes, flangeStandardCode, flangeTypeCode, currentPressureClassId]);

  const validation = useMemo(
    () =>
      validatePressureClass(flangeStandardCode, pressureClassDesignation, workingPressureBar || 0),
    [flangeStandardCode, pressureClassDesignation, workingPressureBar],
  );

  const margin = useMemo(() => {
    if (!workingPressureBar || workingPressureBar <= 0 || !recommendedClassId) return null;
    const selectedClass = classesWithRatings.find((pc) => pc.id === recommendedClassId);
    if (!selectedClass || selectedClass.barRating <= 0) return null;
    return ((selectedClass.barRating - workingPressureBar) / workingPressureBar) * 100;
  }, [workingPressureBar, recommendedClassId, classesWithRatings]);

  return {
    availableClasses: classes,
    recommendedClassId,
    validation,
    classesWithRatings,
    margin,
  };
}
