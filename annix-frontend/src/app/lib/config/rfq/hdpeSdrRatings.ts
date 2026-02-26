import type { HdpeGradeCode } from "./hdpeGrades";
import { HDPE_GRADES } from "./hdpeGrades";

export type SdrValue = 6 | 7.4 | 9 | 11 | 13.6 | 17 | 21 | 26 | 33 | 41;

export type PnClass = 2.5 | 4 | 6 | 8 | 10 | 12.5 | 16 | 20 | 25;

export interface SdrRating {
  sdr: SdrValue;
  pnPE100: PnClass;
  pnPE80: PnClass | null;
  typicalPsi: number;
  applications: string[];
  description: string;
}

export const SDR_RATINGS: Record<SdrValue, SdrRating> = {
  6: {
    sdr: 6,
    pnPE100: 25,
    pnPE80: 20,
    typicalPsi: 315,
    applications: ["High-pressure gas", "Industrial process"],
    description: "Maximum pressure rating for critical applications",
  },
  7.4: {
    sdr: 7.4,
    pnPE100: 20,
    pnPE80: 16,
    typicalPsi: 250,
    applications: ["High-pressure water", "Gas transmission"],
    description: "High-pressure service for demanding applications",
  },
  9: {
    sdr: 9,
    pnPE100: 16,
    pnPE80: 12.5,
    typicalPsi: 200,
    applications: ["High-pressure water", "Gas distribution"],
    description: "Standard high-pressure rating for municipal systems",
  },
  11: {
    sdr: 11,
    pnPE100: 16,
    pnPE80: 12.5,
    typicalPsi: 200,
    applications: ["High-pressure water", "Gas distribution", "Mining"],
    description: "Common high-pressure rating, widely used for water and gas",
  },
  13.6: {
    sdr: 13.6,
    pnPE100: 12.5,
    pnPE80: 10,
    typicalPsi: 160,
    applications: ["Medium-pressure water", "Industrial"],
    description: "Medium-high pressure for water distribution",
  },
  17: {
    sdr: 17,
    pnPE100: 10,
    pnPE80: 8,
    typicalPsi: 125,
    applications: ["Municipal water", "Irrigation"],
    description: "Standard municipal water distribution pressure",
  },
  21: {
    sdr: 21,
    pnPE100: 8,
    pnPE80: 6,
    typicalPsi: 100,
    applications: ["Low-pressure water", "Irrigation", "Sewer force main"],
    description: "Low-pressure water and irrigation systems",
  },
  26: {
    sdr: 26,
    pnPE100: 6,
    pnPE80: 4,
    typicalPsi: 80,
    applications: ["Irrigation", "Low-pressure industrial"],
    description: "Low-pressure irrigation and non-critical applications",
  },
  33: {
    sdr: 33,
    pnPE100: 4,
    pnPE80: null,
    typicalPsi: 50,
    applications: ["Gravity sewer", "Drainage"],
    description: "Gravity flow and low-pressure drainage",
  },
  41: {
    sdr: 41,
    pnPE100: 2.5,
    pnPE80: null,
    typicalPsi: 32,
    applications: ["Gravity sewer", "Conduit"],
    description: "Non-pressure applications, gravity flow only",
  },
};

export const SDR_VALUES: SdrValue[] = [6, 7.4, 9, 11, 13.6, 17, 21, 26, 33, 41];

export const PN_CLASSES: PnClass[] = [2.5, 4, 6, 8, 10, 12.5, 16, 20, 25];

const HDPE_SAFETY_FACTOR = 1.25;

export const calculatePnFromSdr = (sdr: number, gradeCode: HdpeGradeCode): number => {
  const grade = HDPE_GRADES[gradeCode];
  if (!grade || sdr <= 1) {
    return 0;
  }
  const designStress = grade.mrsMpa / HDPE_SAFETY_FACTOR;
  const pn = (20 * designStress) / (sdr - 1);
  return Math.round(pn * 10) / 10;
};

export const calculatePsiFromDr = (dr: number, hdbPsi: number = 4000): number => {
  if (dr <= 1) {
    return 0;
  }
  const psi = (2 * hdbPsi) / (dr - 1);
  return Math.round(psi);
};

export const sdrFromWallThickness = (odMm: number, wallMm: number): number => {
  if (wallMm <= 0) {
    return 0;
  }
  return Math.round((odMm / wallMm) * 10) / 10;
};

export const wallThicknessFromSdr = (odMm: number, sdr: number): number => {
  if (sdr <= 0) {
    return 0;
  }
  return Math.round((odMm / sdr) * 100) / 100;
};

export const innerDiameterFromSdr = (odMm: number, sdr: number): number => {
  const wall = wallThicknessFromSdr(odMm, sdr);
  return Math.round((odMm - 2 * wall) * 100) / 100;
};

export interface PressureRatingResult {
  pnBar: number;
  psi: number;
  sdr: SdrValue;
  grade: HdpeGradeCode;
  wallThicknessMm: number | null;
  notes: string | null;
}

export const pressureRatingForSdr = (
  sdr: SdrValue,
  gradeCode: HdpeGradeCode,
  odMm?: number,
): PressureRatingResult => {
  const rating = SDR_RATINGS[sdr];
  const calculatedPn = calculatePnFromSdr(sdr, gradeCode);
  const wallThicknessMm = odMm ? wallThicknessFromSdr(odMm, sdr) : null;

  return {
    pnBar: calculatedPn,
    psi: rating.typicalPsi,
    sdr,
    grade: gradeCode,
    wallThicknessMm,
    notes: rating.description,
  };
};

export const selectSdrForPressure = (
  requiredPnBar: number,
  gradeCode: HdpeGradeCode,
): SdrValue | null => {
  const sortedSdrs = [...SDR_VALUES].sort((a, b) => b - a);

  for (const sdr of sortedSdrs) {
    const pn = calculatePnFromSdr(sdr, gradeCode);
    if (pn >= requiredPnBar) {
      return sdr;
    }
  }

  return null;
};

export const pnClassForSdr = (sdr: SdrValue, gradeCode: HdpeGradeCode): PnClass | null => {
  const rating = SDR_RATINGS[sdr];
  if (gradeCode === "PE100" || gradeCode === "PE4710") {
    return rating.pnPE100;
  }
  if (gradeCode === "PE80") {
    return rating.pnPE80;
  }
  const calculatedPn = calculatePnFromSdr(sdr, gradeCode);
  const closestPn = PN_CLASSES.reduce((prev, curr) =>
    Math.abs(curr - calculatedPn) < Math.abs(prev - calculatedPn) ? curr : prev,
  );
  return closestPn;
};
