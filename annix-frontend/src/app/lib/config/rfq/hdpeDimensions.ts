import type { HdpeGradeCode } from "./hdpeGrades";
import { HDPE_GRADES } from "./hdpeGrades";
import type { SdrValue } from "./hdpeSdrRatings";

export type HdpeNominalSize =
  | 20
  | 25
  | 32
  | 40
  | 50
  | 63
  | 75
  | 90
  | 110
  | 125
  | 140
  | 160
  | 180
  | 200
  | 225
  | 250
  | 280
  | 315
  | 355
  | 400
  | 450
  | 500
  | 560
  | 630
  | 710
  | 800
  | 900
  | 1000
  | 1200
  | 1400;

export interface HdpeDimensionEntry {
  dnMm: HdpeNominalSize;
  odMm: number;
  sdr: SdrValue;
  wallMm: number;
  idMm: number;
  weightKgM: number;
}

const PE100_SDR17_DIMENSIONS: HdpeDimensionEntry[] = [
  { dnMm: 20, odMm: 20, sdr: 17, wallMm: 1.2, idMm: 17.6, weightKgM: 0.07 },
  { dnMm: 25, odMm: 25, sdr: 17, wallMm: 1.5, idMm: 22.0, weightKgM: 0.11 },
  { dnMm: 32, odMm: 32, sdr: 17, wallMm: 1.9, idMm: 28.2, weightKgM: 0.18 },
  { dnMm: 40, odMm: 40, sdr: 17, wallMm: 2.4, idMm: 35.2, weightKgM: 0.29 },
  { dnMm: 50, odMm: 50, sdr: 17, wallMm: 3.0, idMm: 44.0, weightKgM: 0.45 },
  { dnMm: 63, odMm: 63, sdr: 17, wallMm: 3.8, idMm: 55.4, weightKgM: 0.72 },
  { dnMm: 75, odMm: 75, sdr: 17, wallMm: 4.5, idMm: 66.0, weightKgM: 1.02 },
  { dnMm: 90, odMm: 90, sdr: 17, wallMm: 5.4, idMm: 79.2, weightKgM: 1.46 },
  { dnMm: 110, odMm: 110, sdr: 17, wallMm: 6.6, idMm: 96.8, weightKgM: 2.18 },
  { dnMm: 125, odMm: 125, sdr: 17, wallMm: 7.4, idMm: 110.2, weightKgM: 2.79 },
  { dnMm: 140, odMm: 140, sdr: 17, wallMm: 8.3, idMm: 123.4, weightKgM: 3.51 },
  { dnMm: 160, odMm: 160, sdr: 17, wallMm: 9.5, idMm: 141.0, weightKgM: 4.59 },
  { dnMm: 180, odMm: 180, sdr: 17, wallMm: 10.7, idMm: 158.6, weightKgM: 5.82 },
  { dnMm: 200, odMm: 200, sdr: 17, wallMm: 11.9, idMm: 176.2, weightKgM: 7.18 },
  { dnMm: 225, odMm: 225, sdr: 17, wallMm: 13.4, idMm: 198.2, weightKgM: 9.11 },
  { dnMm: 250, odMm: 250, sdr: 17, wallMm: 14.8, idMm: 220.4, weightKgM: 11.18 },
  { dnMm: 280, odMm: 280, sdr: 17, wallMm: 16.6, idMm: 246.8, weightKgM: 14.05 },
  { dnMm: 315, odMm: 315, sdr: 17, wallMm: 18.7, idMm: 277.6, weightKgM: 17.81 },
  { dnMm: 355, odMm: 355, sdr: 17, wallMm: 21.1, idMm: 312.8, weightKgM: 22.64 },
  { dnMm: 400, odMm: 400, sdr: 17, wallMm: 23.7, idMm: 352.6, weightKgM: 28.64 },
  { dnMm: 450, odMm: 450, sdr: 17, wallMm: 26.7, idMm: 396.6, weightKgM: 36.29 },
  { dnMm: 500, odMm: 500, sdr: 17, wallMm: 29.7, idMm: 440.6, weightKgM: 44.85 },
  { dnMm: 560, odMm: 560, sdr: 17, wallMm: 33.2, idMm: 493.6, weightKgM: 56.15 },
  { dnMm: 630, odMm: 630, sdr: 17, wallMm: 37.4, idMm: 555.2, weightKgM: 71.14 },
  { dnMm: 710, odMm: 710, sdr: 17, wallMm: 42.1, idMm: 625.8, weightKgM: 90.16 },
  { dnMm: 800, odMm: 800, sdr: 17, wallMm: 47.4, idMm: 705.2, weightKgM: 114.44 },
  { dnMm: 900, odMm: 900, sdr: 17, wallMm: 53.3, idMm: 793.4, weightKgM: 144.84 },
  { dnMm: 1000, odMm: 1000, sdr: 17, wallMm: 59.3, idMm: 881.4, weightKgM: 179.01 },
  { dnMm: 1200, odMm: 1200, sdr: 17, wallMm: 71.1, idMm: 1057.8, weightKgM: 257.39 },
  { dnMm: 1400, odMm: 1400, sdr: 17, wallMm: 82.9, idMm: 1234.2, weightKgM: 350.28 },
];

const PE100_SDR11_DIMENSIONS: HdpeDimensionEntry[] = [
  { dnMm: 20, odMm: 20, sdr: 11, wallMm: 1.8, idMm: 16.4, weightKgM: 0.1 },
  { dnMm: 25, odMm: 25, sdr: 11, wallMm: 2.3, idMm: 20.4, weightKgM: 0.17 },
  { dnMm: 32, odMm: 32, sdr: 11, wallMm: 3.0, idMm: 26.0, weightKgM: 0.28 },
  { dnMm: 40, odMm: 40, sdr: 11, wallMm: 3.7, idMm: 32.6, weightKgM: 0.43 },
  { dnMm: 50, odMm: 50, sdr: 11, wallMm: 4.6, idMm: 40.8, weightKgM: 0.67 },
  { dnMm: 63, odMm: 63, sdr: 11, wallMm: 5.8, idMm: 51.4, weightKgM: 1.07 },
  { dnMm: 75, odMm: 75, sdr: 11, wallMm: 6.8, idMm: 61.4, weightKgM: 1.49 },
  { dnMm: 90, odMm: 90, sdr: 11, wallMm: 8.2, idMm: 73.6, weightKgM: 2.16 },
  { dnMm: 110, odMm: 110, sdr: 11, wallMm: 10.0, idMm: 90.0, weightKgM: 3.22 },
  { dnMm: 125, odMm: 125, sdr: 11, wallMm: 11.4, idMm: 102.2, weightKgM: 4.17 },
  { dnMm: 140, odMm: 140, sdr: 11, wallMm: 12.7, idMm: 114.6, weightKgM: 5.2 },
  { dnMm: 160, odMm: 160, sdr: 11, wallMm: 14.6, idMm: 130.8, weightKgM: 6.83 },
  { dnMm: 180, odMm: 180, sdr: 11, wallMm: 16.4, idMm: 147.2, weightKgM: 8.64 },
  { dnMm: 200, odMm: 200, sdr: 11, wallMm: 18.2, idMm: 163.6, weightKgM: 10.67 },
  { dnMm: 225, odMm: 225, sdr: 11, wallMm: 20.5, idMm: 184.0, weightKgM: 13.52 },
  { dnMm: 250, odMm: 250, sdr: 11, wallMm: 22.7, idMm: 204.6, weightKgM: 16.6 },
  { dnMm: 280, odMm: 280, sdr: 11, wallMm: 25.4, idMm: 229.2, weightKgM: 20.83 },
  { dnMm: 315, odMm: 315, sdr: 11, wallMm: 28.6, idMm: 257.8, weightKgM: 26.37 },
  { dnMm: 355, odMm: 355, sdr: 11, wallMm: 32.3, idMm: 290.4, weightKgM: 33.52 },
  { dnMm: 400, odMm: 400, sdr: 11, wallMm: 36.4, idMm: 327.2, weightKgM: 42.6 },
  { dnMm: 450, odMm: 450, sdr: 11, wallMm: 40.9, idMm: 368.2, weightKgM: 53.87 },
  { dnMm: 500, odMm: 500, sdr: 11, wallMm: 45.5, idMm: 409.0, weightKgM: 66.58 },
  { dnMm: 560, odMm: 560, sdr: 11, wallMm: 50.9, idMm: 458.2, weightKgM: 83.38 },
  { dnMm: 630, odMm: 630, sdr: 11, wallMm: 57.3, idMm: 515.4, weightKgM: 105.57 },
];

const PE100_SDR21_DIMENSIONS: HdpeDimensionEntry[] = [
  { dnMm: 63, odMm: 63, sdr: 21, wallMm: 3.0, idMm: 57.0, weightKgM: 0.58 },
  { dnMm: 75, odMm: 75, sdr: 21, wallMm: 3.6, idMm: 67.8, weightKgM: 0.83 },
  { dnMm: 90, odMm: 90, sdr: 21, wallMm: 4.3, idMm: 81.4, weightKgM: 1.19 },
  { dnMm: 110, odMm: 110, sdr: 21, wallMm: 5.3, idMm: 99.4, weightKgM: 1.78 },
  { dnMm: 125, odMm: 125, sdr: 21, wallMm: 6.0, idMm: 113.0, weightKgM: 2.3 },
  { dnMm: 140, odMm: 140, sdr: 21, wallMm: 6.7, idMm: 126.6, weightKgM: 2.87 },
  { dnMm: 160, odMm: 160, sdr: 21, wallMm: 7.7, idMm: 144.6, weightKgM: 3.77 },
  { dnMm: 180, odMm: 180, sdr: 21, wallMm: 8.6, idMm: 162.8, weightKgM: 4.75 },
  { dnMm: 200, odMm: 200, sdr: 21, wallMm: 9.6, idMm: 180.8, weightKgM: 5.88 },
  { dnMm: 225, odMm: 225, sdr: 21, wallMm: 10.8, idMm: 203.4, weightKgM: 7.45 },
  { dnMm: 250, odMm: 250, sdr: 21, wallMm: 11.9, idMm: 226.2, weightKgM: 9.11 },
  { dnMm: 280, odMm: 280, sdr: 21, wallMm: 13.4, idMm: 253.2, weightKgM: 11.48 },
  { dnMm: 315, odMm: 315, sdr: 21, wallMm: 15.0, idMm: 285.0, weightKgM: 14.49 },
  { dnMm: 355, odMm: 355, sdr: 21, wallMm: 16.9, idMm: 321.2, weightKgM: 18.38 },
  { dnMm: 400, odMm: 400, sdr: 21, wallMm: 19.1, idMm: 361.8, weightKgM: 23.38 },
  { dnMm: 450, odMm: 450, sdr: 21, wallMm: 21.5, idMm: 407.0, weightKgM: 29.63 },
  { dnMm: 500, odMm: 500, sdr: 21, wallMm: 23.9, idMm: 452.2, weightKgM: 36.62 },
  { dnMm: 560, odMm: 560, sdr: 21, wallMm: 26.7, idMm: 506.6, weightKgM: 45.82 },
  { dnMm: 630, odMm: 630, sdr: 21, wallMm: 30.0, idMm: 570.0, weightKgM: 57.98 },
];

export const HDPE_DIMENSION_TABLES: Record<SdrValue, HdpeDimensionEntry[]> = {
  6: [],
  7.4: [],
  9: [],
  11: PE100_SDR11_DIMENSIONS,
  13.6: [],
  17: PE100_SDR17_DIMENSIONS,
  21: PE100_SDR21_DIMENSIONS,
  26: [],
  33: [],
  41: [],
};

export const HDPE_NOMINAL_SIZES: HdpeNominalSize[] = [
  20, 25, 32, 40, 50, 63, 75, 90, 110, 125, 140, 160, 180, 200, 225, 250, 280, 315, 355, 400, 450,
  500, 560, 630, 710, 800, 900, 1000, 1200, 1400,
];

const HDPE_DEFAULT_DENSITY = 950;

export const calculatePipeWeight = (
  odMm: number,
  sdr: number,
  gradeCode: HdpeGradeCode = "PE100",
): number => {
  if (odMm <= 0 || sdr <= 1) {
    return 0;
  }

  const density = HDPE_GRADES[gradeCode]?.densityKgM3 ?? HDPE_DEFAULT_DENSITY;
  const wallMm = odMm / sdr;
  const idMm = odMm - 2 * wallMm;

  if (idMm <= 0) {
    return 0;
  }

  const areaMm2 = (Math.PI * (odMm * odMm - idMm * idMm)) / 4;
  const weightKgM = (areaMm2 * density) / 1e6;

  return Math.round(weightKgM * 100) / 100;
};

export const calculateWallThickness = (odMm: number, sdr: number): number => {
  if (sdr <= 0) {
    return 0;
  }
  return Math.round((odMm / sdr) * 100) / 100;
};

export const calculateInnerDiameter = (odMm: number, sdr: number): number => {
  const wall = calculateWallThickness(odMm, sdr);
  return Math.round((odMm - 2 * wall) * 100) / 100;
};

export interface PipeDimensionResult {
  dnMm: number;
  odMm: number;
  sdr: number;
  wallMm: number;
  idMm: number;
  weightKgM: number;
  source: "table" | "calculated";
}

export const pipeDimensions = (
  dnMm: HdpeNominalSize,
  sdr: SdrValue,
  gradeCode: HdpeGradeCode = "PE100",
): PipeDimensionResult => {
  const tableData = HDPE_DIMENSION_TABLES[sdr]?.find((d) => d.dnMm === dnMm);

  if (tableData) {
    return {
      ...tableData,
      source: "table",
    };
  }

  const odMm = dnMm;
  const wallMm = calculateWallThickness(odMm, sdr);
  const idMm = calculateInnerDiameter(odMm, sdr);
  const weightKgM = calculatePipeWeight(odMm, sdr, gradeCode);

  return {
    dnMm,
    odMm,
    sdr,
    wallMm,
    idMm,
    weightKgM,
    source: "calculated",
  };
};

export const availableSizesForSdr = (sdr: SdrValue): HdpeNominalSize[] => {
  const tableData = HDPE_DIMENSION_TABLES[sdr];
  if (tableData && tableData.length > 0) {
    return tableData.map((d) => d.dnMm);
  }
  return HDPE_NOMINAL_SIZES;
};

export const totalPipeWeight = (
  dnMm: HdpeNominalSize,
  sdr: SdrValue,
  lengthM: number,
  quantity: number = 1,
  gradeCode: HdpeGradeCode = "PE100",
): number => {
  const dims = pipeDimensions(dnMm, sdr, gradeCode);
  return Math.round(dims.weightKgM * lengthM * quantity * 100) / 100;
};

export const crossSectionalArea = (odMm: number, sdr: number): number => {
  const idMm = calculateInnerDiameter(odMm, sdr);
  const areaMm2 = (Math.PI * idMm * idMm) / 4;
  return Math.round(areaMm2 * 100) / 100;
};

export const flowCapacityLps = (odMm: number, sdr: number, velocityMs: number = 1.5): number => {
  const areaMm2 = crossSectionalArea(odMm, sdr);
  const areaM2 = areaMm2 / 1e6;
  const flowM3s = areaM2 * velocityMs;
  const flowLps = flowM3s * 1000;
  return Math.round(flowLps * 100) / 100;
};
