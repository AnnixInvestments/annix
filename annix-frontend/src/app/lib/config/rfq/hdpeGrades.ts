export type HdpeGradeCode = "PE32" | "PE40" | "PE63" | "PE80" | "PE100" | "PE4710";

export type HdpeApplication = "water" | "gas" | "industrial" | "irrigation" | "sewer" | "mining";

export type HdpeColorCode = "black" | "blue" | "yellow" | "green" | "orange";

export interface HdpeGrade {
  code: HdpeGradeCode;
  name: string;
  mrsMpa: number;
  designStressMpa: number;
  densityKgM3: number;
  cellClass: string | null;
  lifespanYears: { min: number; max: number };
  maxContinuousTempC: number;
  applications: HdpeApplication[];
  colorCodes: HdpeColorCode[];
  specifications: string[];
  description: string;
}

const HDPE_SAFETY_FACTOR = 1.25;

export const HDPE_GRADES: Record<HdpeGradeCode, HdpeGrade> = {
  PE32: {
    code: "PE32",
    name: "PE32 (Low Density)",
    mrsMpa: 3.2,
    designStressMpa: 3.2 / HDPE_SAFETY_FACTOR,
    densityKgM3: 930,
    cellClass: null,
    lifespanYears: { min: 25, max: 50 },
    maxContinuousTempC: 40,
    applications: ["irrigation"],
    colorCodes: ["black"],
    specifications: ["ISO 4427"],
    description: "Low-pressure polyethylene for non-critical irrigation and drainage",
  },
  PE40: {
    code: "PE40",
    name: "PE40 (Medium-Low Density)",
    mrsMpa: 4.0,
    designStressMpa: 4.0 / HDPE_SAFETY_FACTOR,
    densityKgM3: 935,
    cellClass: null,
    lifespanYears: { min: 25, max: 50 },
    maxContinuousTempC: 40,
    applications: ["irrigation", "sewer"],
    colorCodes: ["black"],
    specifications: ["ISO 4427"],
    description: "Low-pressure polyethylene for irrigation and non-pressure drainage",
  },
  PE63: {
    code: "PE63",
    name: "PE63 (Medium Density)",
    mrsMpa: 6.3,
    designStressMpa: 6.3 / HDPE_SAFETY_FACTOR,
    densityKgM3: 940,
    cellClass: null,
    lifespanYears: { min: 50, max: 75 },
    maxContinuousTempC: 50,
    applications: ["water", "irrigation", "sewer"],
    colorCodes: ["black", "blue"],
    specifications: ["ISO 4427", "AWWA C901"],
    description: "Medium-pressure polyethylene for water distribution and irrigation",
  },
  PE80: {
    code: "PE80",
    name: "PE80 (High Density)",
    mrsMpa: 8.0,
    designStressMpa: 8.0 / HDPE_SAFETY_FACTOR,
    densityKgM3: 945,
    cellClass: "345464C",
    lifespanYears: { min: 50, max: 100 },
    maxContinuousTempC: 60,
    applications: ["water", "gas", "industrial"],
    colorCodes: ["black", "blue", "yellow"],
    specifications: ["ISO 4427", "ISO 4437", "AWWA C906", "ASTM D3350"],
    description: "High-density polyethylene for pressure water and gas distribution",
  },
  PE100: {
    code: "PE100",
    name: "PE100 (High Density - Standard)",
    mrsMpa: 10.0,
    designStressMpa: 10.0 / HDPE_SAFETY_FACTOR,
    densityKgM3: 950,
    cellClass: "445574C",
    lifespanYears: { min: 50, max: 100 },
    maxContinuousTempC: 60,
    applications: ["water", "gas", "industrial", "mining"],
    colorCodes: ["black", "blue", "yellow"],
    specifications: ["ISO 4427", "ISO 4437", "EN 12201", "AWWA C906", "ASTM D3350"],
    description: "Industry-standard high-density polyethylene for municipal water and gas systems",
  },
  PE4710: {
    code: "PE4710",
    name: "PE4710 (High Performance)",
    mrsMpa: 10.0,
    designStressMpa: 10.0 / HDPE_SAFETY_FACTOR,
    densityKgM3: 955,
    cellClass: "445574C",
    lifespanYears: { min: 50, max: 100 },
    maxContinuousTempC: 60,
    applications: ["water", "gas", "industrial", "mining"],
    colorCodes: ["black", "blue", "yellow"],
    specifications: ["ASTM D3350", "ASTM F714", "AWWA C906", "AWWA C901"],
    description: "US-standard high-performance HDPE with superior slow crack growth resistance",
  },
};

export const HDPE_GRADE_LIST: HdpeGradeCode[] = ["PE32", "PE40", "PE63", "PE80", "PE100", "PE4710"];

export const HDPE_COLOR_APPLICATIONS: Record<HdpeColorCode, HdpeApplication[]> = {
  black: ["industrial", "mining", "sewer"],
  blue: ["water"],
  yellow: ["gas"],
  green: ["sewer"],
  orange: ["industrial"],
};

export const hdpeGradeByCode = (code: HdpeGradeCode): HdpeGrade => {
  return HDPE_GRADES[code];
};

export const hdpeGradesByApplication = (application: HdpeApplication): HdpeGrade[] => {
  return HDPE_GRADE_LIST.map((code) => HDPE_GRADES[code]).filter((grade) =>
    grade.applications.includes(application),
  );
};

export const suggestedColorForApplication = (application: HdpeApplication): HdpeColorCode => {
  const colorMapping: Record<HdpeApplication, HdpeColorCode> = {
    water: "blue",
    gas: "yellow",
    industrial: "black",
    irrigation: "black",
    sewer: "green",
    mining: "black",
  };
  return colorMapping[application];
};

export const hdsSafetyFactor = (): number => HDPE_SAFETY_FACTOR;
