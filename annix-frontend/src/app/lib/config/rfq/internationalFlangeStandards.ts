export interface InternationalFlangeStandard {
  code: string;
  name: string;
  country: string;
  pressureSystem: "PN" | "K" | "Class";
  pressureClasses: string[];
  sizeRangeNPS: string;
  equivalentTo?: string[];
  notes?: string;
}

export const INTERNATIONAL_FLANGE_STANDARDS: InternationalFlangeStandard[] = [
  {
    code: "JIS B 2220",
    name: "Steel Pipe Flanges",
    country: "Japan",
    pressureSystem: "K",
    pressureClasses: ["5K", "10K", "16K", "20K", "30K", "40K", "63K"],
    sizeRangeNPS: "10A - 1500A",
    notes:
      "K ratings in kgf/cm². 10K ≈ PN 10. Unique bolt patterns differ from EN/ASME. Flat face (FF) standard.",
  },
  {
    code: "DIN 2573",
    name: "Plate Flanges for Welding",
    country: "Germany",
    pressureSystem: "PN",
    pressureClasses: ["PN 6", "PN 10", "PN 16", "PN 25", "PN 40"],
    sizeRangeNPS: "DN 10 - DN 1200",
    equivalentTo: ["EN 1092-1 Type 01", "BS 4504 /1", "ISO 7005-1"],
    notes: "Specific standard for plate flanges. Part of EN 1092-1 Type 01 series.",
  },
  {
    code: "DIN 2501",
    name: "Flanges - PN Designated",
    country: "Germany",
    pressureSystem: "PN",
    pressureClasses: ["PN 6", "PN 10", "PN 16", "PN 25", "PN 40", "PN 63", "PN 100", "PN 160"],
    sizeRangeNPS: "DN 10 - DN 4000",
    equivalentTo: ["EN 1092-1", "BS 4504", "ISO 7005-1"],
    notes: "Superseded by EN 1092-1. Same dimensions as BS 4504.",
  },
  {
    code: "GB/T 9113",
    name: "Integral Steel Pipe Flanges",
    country: "China",
    pressureSystem: "PN",
    pressureClasses: [
      "PN 2.5",
      "PN 6",
      "PN 10",
      "PN 16",
      "PN 25",
      "PN 40",
      "PN 63",
      "PN 100",
      "PN 160",
      "PN 250",
      "PN 320",
      "PN 400",
    ],
    sizeRangeNPS: "DN 10 - DN 2000",
    equivalentTo: ["EN 1092-1", "DIN 2501", "ISO 7005-1"],
    notes:
      "Chinese national standard based on DIN/EN system. Dimensions match EN 1092-1 for equivalent PN ratings.",
  },
  {
    code: "GB/T 9119",
    name: "Slip-On Welding Steel Pipe Flanges",
    country: "China",
    pressureSystem: "PN",
    pressureClasses: ["PN 6", "PN 10", "PN 16", "PN 25", "PN 40"],
    sizeRangeNPS: "DN 10 - DN 600",
    equivalentTo: ["EN 1092-1 Type 02", "BS 4504 /2"],
    notes: "Chinese slip-on flange standard. Dimensions compatible with EN 1092-1.",
  },
  {
    code: "ISO 7005-1",
    name: "Metallic Flanges - Part 1: Steel Flanges",
    country: "International",
    pressureSystem: "PN",
    pressureClasses: ["PN 2.5", "PN 6", "PN 10", "PN 16", "PN 25", "PN 40", "PN 63", "PN 100"],
    sizeRangeNPS: "DN 10 - DN 4000",
    equivalentTo: ["EN 1092-1", "BS 4504", "DIN 2501", "AS 4331"],
    notes:
      "International standard that EN 1092-1 is based on. AS/NZS 4331 is identical reproduction.",
  },
  {
    code: "EN 1092-1",
    name: "Flanges and Their Joints - Circular Flanges for Pipes, Valves, Fittings",
    country: "Europe",
    pressureSystem: "PN",
    pressureClasses: [
      "PN 2.5",
      "PN 6",
      "PN 10",
      "PN 16",
      "PN 25",
      "PN 40",
      "PN 63",
      "PN 100",
      "PN 160",
      "PN 250",
      "PN 320",
      "PN 400",
    ],
    sizeRangeNPS: "DN 10 - DN 4000",
    equivalentTo: ["BS 4504", "DIN 2501", "ISO 7005-1"],
    notes:
      "Current European standard. Supersedes BS 4504 and DIN 2501. Primary PN-based flange standard.",
  },
  {
    code: "BS 4504",
    name: "Circular Flanges for Pipes, Valves and Fittings",
    country: "UK",
    pressureSystem: "PN",
    pressureClasses: ["PN 6", "PN 10", "PN 16", "PN 25", "PN 40", "PN 64", "PN 100", "PN 160"],
    sizeRangeNPS: "DN 10 - DN 4000",
    equivalentTo: ["EN 1092-1", "DIN 2501", "ISO 7005-1"],
    notes: "Now obsolete, replaced by BS EN 1092-1. Still widely referenced in industry.",
  },
];

export interface JisPressureClassInfo {
  designation: string;
  nominalPressureKgf: number;
  nominalPressureBar: number;
  approximatePn: string;
  notes?: string;
}

export const JIS_PRESSURE_CLASSES: JisPressureClassInfo[] = [
  {
    designation: "2K",
    nominalPressureKgf: 2,
    nominalPressureBar: 2,
    approximatePn: "PN 2.5",
    notes: "Low pressure, rarely used",
  },
  {
    designation: "5K",
    nominalPressureKgf: 5,
    nominalPressureBar: 5,
    approximatePn: "PN 6",
    notes: "Low pressure applications",
  },
  {
    designation: "10K",
    nominalPressureKgf: 10,
    nominalPressureBar: 10,
    approximatePn: "PN 10",
    notes: "Most common JIS class",
  },
  {
    designation: "16K",
    nominalPressureKgf: 16,
    nominalPressureBar: 16,
    approximatePn: "PN 16",
    notes: "Medium pressure applications",
  },
  {
    designation: "20K",
    nominalPressureKgf: 20,
    nominalPressureBar: 20,
    approximatePn: "PN 25",
    notes: "Higher pressure applications",
  },
  {
    designation: "30K",
    nominalPressureKgf: 30,
    nominalPressureBar: 30,
    approximatePn: "PN 40",
    notes: "High pressure applications",
  },
  {
    designation: "40K",
    nominalPressureKgf: 40,
    nominalPressureBar: 40,
    approximatePn: "PN 63",
    notes: "Very high pressure",
  },
  {
    designation: "63K",
    nominalPressureKgf: 63,
    nominalPressureBar: 63,
    approximatePn: "PN 100",
    notes: "Maximum JIS class",
  },
];

export interface StandardEquivalenceInfo {
  pnDesignation: string;
  en1092Type: string;
  bs4504Type: string;
  din2501Type: string;
  gbtEquivalent: string;
  jisPressureClass: string;
  asmeClassApprox: string;
  notes?: string;
}

export const STANDARD_EQUIVALENCES: StandardEquivalenceInfo[] = [
  {
    pnDesignation: "PN 6",
    en1092Type: "PN 6",
    bs4504Type: "6/3",
    din2501Type: "PN 6",
    gbtEquivalent: "PN 0.6 MPa",
    jisPressureClass: "5K",
    asmeClassApprox: "Class 150 (at elevated temp)",
    notes: "JIS 5K has different bolt pattern",
  },
  {
    pnDesignation: "PN 10",
    en1092Type: "PN 10",
    bs4504Type: "10/3",
    din2501Type: "PN 10",
    gbtEquivalent: "PN 1.0 MPa",
    jisPressureClass: "10K",
    asmeClassApprox: "Class 150",
    notes: "Most common metric class. JIS 10K dimensions differ from PN 10",
  },
  {
    pnDesignation: "PN 16",
    en1092Type: "PN 16",
    bs4504Type: "16/3",
    din2501Type: "PN 16",
    gbtEquivalent: "PN 1.6 MPa",
    jisPressureClass: "16K",
    asmeClassApprox: "Class 150",
    notes: "Standard European industrial class",
  },
  {
    pnDesignation: "PN 25",
    en1092Type: "PN 25",
    bs4504Type: "25/3",
    din2501Type: "PN 25",
    gbtEquivalent: "PN 2.5 MPa",
    jisPressureClass: "20K",
    asmeClassApprox: "Class 300 (at elevated temp)",
  },
  {
    pnDesignation: "PN 40",
    en1092Type: "PN 40",
    bs4504Type: "40/3",
    din2501Type: "PN 40",
    gbtEquivalent: "PN 4.0 MPa",
    jisPressureClass: "30K",
    asmeClassApprox: "Class 300",
  },
  {
    pnDesignation: "PN 63",
    en1092Type: "PN 63",
    bs4504Type: "64/3",
    din2501Type: "PN 63",
    gbtEquivalent: "PN 6.4 MPa",
    jisPressureClass: "40K",
    asmeClassApprox: "Class 600 (at elevated temp)",
  },
  {
    pnDesignation: "PN 100",
    en1092Type: "PN 100",
    bs4504Type: "100/3",
    din2501Type: "PN 100",
    gbtEquivalent: "PN 10.0 MPa",
    jisPressureClass: "63K",
    asmeClassApprox: "Class 600",
  },
];

export const flangeStandardByCode = (code: string): InternationalFlangeStandard | null => {
  return (
    INTERNATIONAL_FLANGE_STANDARDS.find((s) => s.code.toUpperCase() === code.toUpperCase()) || null
  );
};

export const jisPressureClassInfo = (designation: string): JisPressureClassInfo | null => {
  return JIS_PRESSURE_CLASSES.find((c) => c.designation === designation) || null;
};

export const pnToJisEquivalent = (pnDesignation: string): string | null => {
  const equiv = STANDARD_EQUIVALENCES.find((e) => e.pnDesignation === pnDesignation);
  return equiv?.jisPressureClass || null;
};

export const jisToPnEquivalent = (jisClass: string): string | null => {
  const equiv = STANDARD_EQUIVALENCES.find((e) => e.jisPressureClass === jisClass);
  return equiv?.pnDesignation || null;
};

export const standardsWithSameDimensions = (code: string): string[] => {
  const standard = flangeStandardByCode(code);
  if (!standard?.equivalentTo) {
    return [];
  }
  return standard.equivalentTo;
};
