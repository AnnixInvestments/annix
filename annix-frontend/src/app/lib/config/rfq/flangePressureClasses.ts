export interface FlangePressureClass {
  designation: string;
  nominalPressureBar: number;
  nominalPressurePsi: number;
  standard: string;
  sizeRangeNPS: string;
  notes?: string;
}

export interface FlangeStandard {
  code: string;
  name: string;
  sizeRangeNPS: string;
  pressureClasses: string[];
  notes?: string;
}

export const ASME_B165_CLASSES: FlangePressureClass[] = [
  {
    designation: "150",
    nominalPressureBar: 20,
    nominalPressurePsi: 285,
    standard: "ASME B16.5",
    sizeRangeNPS: "1/2 - 24",
    notes: "Most common class for general industrial applications",
  },
  {
    designation: "300",
    nominalPressureBar: 50,
    nominalPressurePsi: 740,
    standard: "ASME B16.5",
    sizeRangeNPS: "1/2 - 24",
    notes: "Standard for medium-pressure applications",
  },
  {
    designation: "400",
    nominalPressureBar: 68,
    nominalPressurePsi: 990,
    standard: "ASME B16.5",
    sizeRangeNPS: "1/2 - 24",
    notes: "Less common intermediate class",
  },
  {
    designation: "600",
    nominalPressureBar: 100,
    nominalPressurePsi: 1480,
    standard: "ASME B16.5",
    sizeRangeNPS: "1/2 - 24",
    notes: "High-pressure industrial applications",
  },
  {
    designation: "900",
    nominalPressureBar: 150,
    nominalPressurePsi: 2220,
    standard: "ASME B16.5",
    sizeRangeNPS: "1/2 - 24",
    notes: "Very high-pressure applications",
  },
  {
    designation: "1500",
    nominalPressureBar: 250,
    nominalPressurePsi: 3705,
    standard: "ASME B16.5",
    sizeRangeNPS: "1/2 - 24",
    notes: "Extreme pressure applications",
  },
  {
    designation: "2500",
    nominalPressureBar: 420,
    nominalPressurePsi: 6170,
    standard: "ASME B16.5",
    sizeRangeNPS: "1/2 - 12",
    notes: "Maximum standard class, limited size range",
  },
];

export const ASME_B1647_CLASSES: FlangePressureClass[] = [
  {
    designation: "75",
    nominalPressureBar: 10,
    nominalPressurePsi: 142,
    standard: "ASME B16.47",
    sizeRangeNPS: "26 - 60",
    notes: "Series B only. Half of Class 150 ratings",
  },
  {
    designation: "150",
    nominalPressureBar: 20,
    nominalPressurePsi: 285,
    standard: "ASME B16.47",
    sizeRangeNPS: "26 - 60",
    notes: "Large diameter equivalent of B16.5 Class 150",
  },
  {
    designation: "300",
    nominalPressureBar: 50,
    nominalPressurePsi: 740,
    standard: "ASME B16.47",
    sizeRangeNPS: "26 - 60",
  },
  {
    designation: "400",
    nominalPressureBar: 68,
    nominalPressurePsi: 990,
    standard: "ASME B16.47",
    sizeRangeNPS: "26 - 60",
  },
  {
    designation: "600",
    nominalPressureBar: 100,
    nominalPressurePsi: 1480,
    standard: "ASME B16.47",
    sizeRangeNPS: "26 - 60",
  },
  {
    designation: "900",
    nominalPressureBar: 150,
    nominalPressurePsi: 2220,
    standard: "ASME B16.47",
    sizeRangeNPS: "26 - 60",
    notes: "Maximum class for large diameter flanges",
  },
];

export const FLANGE_STANDARDS: FlangeStandard[] = [
  {
    code: "ASME B16.5",
    name: "Pipe Flanges and Flanged Fittings",
    sizeRangeNPS: "1/2 - 24",
    pressureClasses: ["150", "300", "400", "600", "900", "1500", "2500"],
    notes: "Primary US/international standard for small to medium bore flanges",
  },
  {
    code: "ASME B16.47 A",
    name: "Large Diameter Steel Flanges - Series A",
    sizeRangeNPS: "26 - 60",
    pressureClasses: ["75", "150", "300", "400", "600", "900"],
    notes: "Thicker, higher load capacity. Based on MSS SP-44",
  },
  {
    code: "ASME B16.47 B",
    name: "Large Diameter Steel Flanges - Series B",
    sizeRangeNPS: "26 - 60",
    pressureClasses: ["75", "150", "300", "400", "600", "900"],
    notes: "Compact, lighter design. Based on API 605",
  },
  {
    code: "ASME B16.36",
    name: "Orifice Flanges",
    sizeRangeNPS: "1/2 - 24",
    pressureClasses: ["300", "400", "600", "900", "1500", "2500"],
    notes: "Minimum Class 300 due to meter connection thickness requirements",
  },
];

export interface UnavailablePressureClass {
  designation: string;
  reason: string;
  alternative?: string;
  standardReference?: string;
}

export const UNAVAILABLE_PRESSURE_CLASSES: UnavailablePressureClass[] = [
  {
    designation: "50",
    reason:
      "Class 50 does not exist in ASME flange standards. PN 50 (metric) equals approximately Class 300 (divide class by ~6 to get bar).",
    alternative: "Use Class 150 for ~20 bar or Class 300 for ~50 bar working pressure",
  },
  {
    designation: "800",
    reason:
      "Class 800 exists only for VALVES per API 602 and ISO 15761, not for flanges. It is an intermediate class between Class 600 and Class 900.",
    alternative: "Use Class 600 or Class 900 flanges with Class 800 valves",
    standardReference: "API 602, ISO 15761",
  },
  {
    designation: "1200",
    reason:
      "Class 1200 does not exist in any ASME standard. Pressure classes jump from 900 to 1500.",
    alternative: "Use Class 900 for ~150 bar or Class 1500 for ~250 bar working pressure",
  },
  {
    designation: "1000",
    reason:
      "Class 1000 does not exist in ASME flange standards. Standard classes are 150, 300, 400, 600, 900, 1500, 2500.",
    alternative: "Use Class 900 or Class 1500",
  },
  {
    designation: "3000",
    reason:
      "Class 3000 exists only for socket weld and threaded fittings (ASME B16.11), not for flanges.",
    alternative: "Use Class 2500 flanges (maximum available)",
    standardReference: "ASME B16.11",
  },
  {
    designation: "6000",
    reason:
      "Class 6000 exists only for socket weld and threaded fittings (ASME B16.11), not for flanges.",
    alternative: "Use Class 2500 flanges with special high-pressure design",
    standardReference: "ASME B16.11",
  },
];

export const VALVE_ONLY_CLASSES = [
  {
    designation: "800",
    nominalPressureBar: 132,
    nominalPressurePsi: 1920,
    standard: "API 602",
    notes:
      "Forged steel gate, globe, and check valves only. P-T ratings interpolated: 1/3 Class 600 + 2/3 Class 900",
  },
];

export const FITTING_ONLY_CLASSES = [
  {
    designation: "2000",
    nominalPressureBar: 340,
    nominalPressurePsi: 5000,
    standard: "ASME B16.11",
    notes: "Socket weld and threaded fittings only",
  },
  {
    designation: "3000",
    nominalPressureBar: 510,
    nominalPressurePsi: 7500,
    standard: "ASME B16.11",
    notes: "Socket weld and threaded fittings only",
  },
  {
    designation: "6000",
    nominalPressureBar: 1020,
    nominalPressurePsi: 15000,
    standard: "ASME B16.11",
    notes: "Socket weld and threaded fittings only",
  },
];

export const validFlangePressureClass = (
  designation: string,
  standard: "ASME B16.5" | "ASME B16.47" | "ASME B16.36",
): boolean => {
  const standardConfig = FLANGE_STANDARDS.find(
    (s) => s.code === standard || s.code.startsWith(standard),
  );
  if (!standardConfig) {
    return false;
  }
  return standardConfig.pressureClasses.includes(designation);
};

export const unavailableClassInfo = (designation: string): UnavailablePressureClass | null => {
  return UNAVAILABLE_PRESSURE_CLASSES.find((c) => c.designation === designation) || null;
};

export const pressureClassNotes = (designation: string): string | null => {
  const unavailable = unavailableClassInfo(designation);
  if (unavailable) {
    return `${unavailable.reason} ${unavailable.alternative || ""}`;
  }
  return null;
};
