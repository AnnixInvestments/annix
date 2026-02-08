/**
 * SABS 719 Lateral Dimensions Data
 *
 * Data extracted from MPS Technical Manual - Page 33
 *
 * Laterals are pipe fittings where a branch pipe connects to a run pipe at an angle.
 * Three angle ranges are supported:
 * - 60-90°: Steep angle laterals (A, B dimensions)
 * - 45-59°: Medium angle laterals (C, D dimensions)
 * - 30-44°: Shallow angle laterals (E, F dimensions)
 *
 * Dimensions:
 * - A/C/E: Height from run pipe centerline to branch pipe end (varies by angle)
 * - B/D/F: Base length of the run pipe section (varies by angle)
 *
 * The shallower the angle, the longer both dimensions become.
 */

export type LateralAngleRange = "60-90" | "45-59" | "30-44";

export interface Sabs719LateralDimensions {
  nominalBoreMm: number;
  outsideDiameterMm: number;
  dimensions: {
    "60-90": { heightMm: number; baseLengthMm: number };
    "45-59": { heightMm: number; baseLengthMm: number };
    "30-44": { heightMm: number; baseLengthMm: number };
  };
}

export const SABS_719_LATERAL_DATA: Sabs719LateralDimensions[] = [
  {
    nominalBoreMm: 200,
    outsideDiameterMm: 219.1,
    dimensions: {
      "60-90": { heightMm: 430, baseLengthMm: 610 },
      "45-59": { heightMm: 610, baseLengthMm: 710 },
      "30-44": { heightMm: 815, baseLengthMm: 915 },
    },
  },
  {
    nominalBoreMm: 250,
    outsideDiameterMm: 273.1,
    dimensions: {
      "60-90": { heightMm: 485, baseLengthMm: 685 },
      "45-59": { heightMm: 685, baseLengthMm: 815 },
      "30-44": { heightMm: 940, baseLengthMm: 1065 },
    },
  },
  {
    nominalBoreMm: 300,
    outsideDiameterMm: 323.9,
    dimensions: {
      "60-90": { heightMm: 535, baseLengthMm: 760 },
      "45-59": { heightMm: 760, baseLengthMm: 915 },
      "30-44": { heightMm: 1005, baseLengthMm: 1220 },
    },
  },
  {
    nominalBoreMm: 350,
    outsideDiameterMm: 355.6,
    dimensions: {
      "60-90": { heightMm: 585, baseLengthMm: 840 },
      "45-59": { heightMm: 840, baseLengthMm: 1020 },
      "30-44": { heightMm: 1195, baseLengthMm: 1370 },
    },
  },
  {
    nominalBoreMm: 400,
    outsideDiameterMm: 406.4,
    dimensions: {
      "60-90": { heightMm: 635, baseLengthMm: 915 },
      "45-59": { heightMm: 915, baseLengthMm: 1120 },
      "30-44": { heightMm: 1320, baseLengthMm: 1520 },
    },
  },
  {
    nominalBoreMm: 450,
    outsideDiameterMm: 457.0,
    dimensions: {
      "60-90": { heightMm: 685, baseLengthMm: 990 },
      "45-59": { heightMm: 990, baseLengthMm: 1220 },
      "30-44": { heightMm: 1450, baseLengthMm: 1670 },
    },
  },
  {
    nominalBoreMm: 500,
    outsideDiameterMm: 508.0,
    dimensions: {
      "60-90": { heightMm: 740, baseLengthMm: 1065 },
      "45-59": { heightMm: 1065, baseLengthMm: 1320 },
      "30-44": { heightMm: 1575, baseLengthMm: 1830 },
    },
  },
  {
    nominalBoreMm: 550,
    outsideDiameterMm: 559.0,
    dimensions: {
      "60-90": { heightMm: 790, baseLengthMm: 1140 },
      "45-59": { heightMm: 1140, baseLengthMm: 1420 },
      "30-44": { heightMm: 1700, baseLengthMm: 1980 },
    },
  },
  {
    nominalBoreMm: 600,
    outsideDiameterMm: 610.0,
    dimensions: {
      "60-90": { heightMm: 840, baseLengthMm: 1220 },
      "45-59": { heightMm: 1220, baseLengthMm: 1520 },
      "30-44": { heightMm: 1830, baseLengthMm: 2130 },
    },
  },
  {
    nominalBoreMm: 650,
    outsideDiameterMm: 660.0,
    dimensions: {
      "60-90": { heightMm: 890, baseLengthMm: 1295 },
      "45-59": { heightMm: 1295, baseLengthMm: 1630 },
      "30-44": { heightMm: 1955, baseLengthMm: 2280 },
    },
  },
  {
    nominalBoreMm: 700,
    outsideDiameterMm: 711.0,
    dimensions: {
      "60-90": { heightMm: 940, baseLengthMm: 1370 },
      "45-59": { heightMm: 1370, baseLengthMm: 1730 },
      "30-44": { heightMm: 2080, baseLengthMm: 2430 },
    },
  },
  {
    nominalBoreMm: 750,
    outsideDiameterMm: 762.0,
    dimensions: {
      "60-90": { heightMm: 990, baseLengthMm: 1445 },
      "45-59": { heightMm: 1445, baseLengthMm: 1830 },
      "30-44": { heightMm: 2210, baseLengthMm: 2595 },
    },
  },
  {
    nominalBoreMm: 800,
    outsideDiameterMm: 813.0,
    dimensions: {
      "60-90": { heightMm: 1045, baseLengthMm: 1520 },
      "45-59": { heightMm: 1520, baseLengthMm: 1930 },
      "30-44": { heightMm: 2335, baseLengthMm: 2745 },
    },
  },
  {
    nominalBoreMm: 850,
    outsideDiameterMm: 864.0,
    dimensions: {
      "60-90": { heightMm: 1095, baseLengthMm: 1595 },
      "45-59": { heightMm: 1595, baseLengthMm: 2030 },
      "30-44": { heightMm: 2465, baseLengthMm: 2895 },
    },
  },
  {
    nominalBoreMm: 900,
    outsideDiameterMm: 914.0,
    dimensions: {
      "60-90": { heightMm: 1145, baseLengthMm: 1670 },
      "45-59": { heightMm: 1670, baseLengthMm: 2130 },
      "30-44": { heightMm: 2595, baseLengthMm: 3040 },
    },
  },
];

export function getSabs719LateralDimensions(
  nominalBoreMm: number,
): Sabs719LateralDimensions | null {
  return SABS_719_LATERAL_DATA.find((d) => d.nominalBoreMm === nominalBoreMm) || null;
}

export function getLateralDimensionsForAngle(
  nominalBoreMm: number,
  angleRange: LateralAngleRange,
): { heightMm: number; baseLengthMm: number; outsideDiameterMm: number } | null {
  const dims = getSabs719LateralDimensions(nominalBoreMm);
  if (!dims) return null;
  return {
    ...dims.dimensions[angleRange],
    outsideDiameterMm: dims.outsideDiameterMm,
  };
}

export function getAngleRangeFromDegrees(degrees: number): LateralAngleRange {
  if (degrees >= 60) return "60-90";
  if (degrees >= 45) return "45-59";
  return "30-44";
}

export function getDefaultAngleForRange(angleRange: LateralAngleRange): number {
  const defaults: Record<LateralAngleRange, number> = {
    "60-90": 60,
    "45-59": 45,
    "30-44": 30,
  };
  return defaults[angleRange];
}
