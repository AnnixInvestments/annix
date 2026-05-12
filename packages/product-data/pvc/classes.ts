// PVC pressure-class registry. Each class is the max sustained
// working pressure at 20 °C in bar. Validity per grade follows
// manufacturer catalogue convention — PVC-U covers the broadest
// range, PVC-M extends to Class 25, PVC-O starts at Class 16 and
// extends to Class 40 (the high-performance niche).
//
// Standard reproduction posture: class numbers themselves are
// generic engineering terminology, not SANS table content. The
// wall thickness needed to achieve each class IS catalogue-sourced
// (see dimensions.ts) and never lifted from SANS 966 tables.

import type { PvcGradeCode } from "./grades";

export type PvcPressureClass = 6 | 9 | 12 | 16 | 20 | 25 | 34 | 40;

export interface PvcClassInfo {
  // Class number (also the pressure rating in bar at 20 °C).
  value: PvcPressureClass;
  // Display label e.g. "Class 16".
  label: string;
  // Max working pressure at 20 °C, bar.
  ratedPressureBar: number;
  // Max working pressure at 20 °C, kPa.
  ratedPressureKpa: number;
  // Short description for the UI dropdown — explains typical service.
  description: string;
}

export const PVC_PRESSURE_CLASSES: Record<PvcPressureClass, PvcClassInfo> = {
  6: {
    value: 6,
    label: "Class 6",
    ratedPressureBar: 6,
    ratedPressureKpa: 600,
    description: "Low-pressure sewer / gravity / drainage service",
  },
  9: {
    value: 9,
    label: "Class 9",
    ratedPressureBar: 9,
    ratedPressureKpa: 900,
    description: "Light-duty pressure — secondary distribution lines",
  },
  12: {
    value: 12,
    label: "Class 12",
    ratedPressureBar: 12,
    ratedPressureKpa: 1200,
    description: "Standard municipal water distribution",
  },
  16: {
    value: 16,
    label: "Class 16",
    ratedPressureBar: 16,
    ratedPressureKpa: 1600,
    description: "Pressure mains, primary distribution",
  },
  20: {
    value: 20,
    label: "Class 20",
    ratedPressureBar: 20,
    ratedPressureKpa: 2000,
    description: "Heavy-duty industrial / pump discharge",
  },
  25: {
    value: 25,
    label: "Class 25",
    ratedPressureBar: 25,
    ratedPressureKpa: 2500,
    description: "Extra heavy-duty / high-pressure service",
  },
  34: {
    value: 34,
    label: "Class 34",
    ratedPressureBar: 34,
    ratedPressureKpa: 3400,
    description: "High-pressure mining (PVC-O only)",
  },
  40: {
    value: 40,
    label: "Class 40",
    ratedPressureBar: 40,
    ratedPressureKpa: 4000,
    description: "Maximum PVC pressure rating (PVC-O specialty)",
  },
};

export const PVC_PRESSURE_CLASS_LIST: PvcPressureClass[] = [6, 9, 12, 16, 20, 25, 34, 40];

// Which grade × class combinations are produced commercially.
// Sourced from Flo-Tek, Marley, Macneil, Sizabantu, Agrico
// catalogues — engineering would be technically possible outside
// this matrix but no supplier stocks it, so quoting outside the
// matrix invites delivery risk.
const VALID_CLASSES_PER_GRADE: Record<PvcGradeCode, PvcPressureClass[]> = {
  "PVC-U": [6, 9, 12, 16, 20, 25],
  "PVC-M": [9, 12, 16, 20, 25],
  "PVC-O": [16, 20, 25, 34, 40],
};

export const validPvcPressureClassesForGrade = (grade: PvcGradeCode): PvcPressureClass[] =>
  VALID_CLASSES_PER_GRADE[grade];

export const isPvcClassValidForGrade = (
  grade: PvcGradeCode,
  pressureClass: PvcPressureClass,
): boolean => VALID_CLASSES_PER_GRADE[grade].includes(pressureClass);

// Pick the lowest catalogue-available class that meets the
// required working pressure for the given grade. Returns null if
// no commercially-available class covers the spec (the engineer
// then needs to upgrade grade or use steel).
export const recommendedPvcClassForPressure = (
  grade: PvcGradeCode,
  workingPressureBar: number,
): PvcPressureClass | null => {
  const validClasses = VALID_CLASSES_PER_GRADE[grade];
  const sorted = [...validClasses].sort((a, b) => a - b);
  return sorted.find((cls) => cls >= workingPressureBar) ?? null;
};
