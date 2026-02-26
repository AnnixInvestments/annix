export type WeldingStandardCode =
  | "ASTM_F2620"
  | "ISO_21307"
  | "DVS_2207_1"
  | "DVS_2207_11"
  | "WIS_4_32_08";

export type WeldingStandardRegion = "US" | "EU" | "Global" | "UK";

export type FusionProcedureType = "SHP" | "LP" | "DLP";

export interface WeldingStandard {
  code: WeldingStandardCode;
  name: string;
  fullName: string;
  region: WeldingStandardRegion;
  description: string;
  procedureTypes: FusionProcedureType[];
  heatPlateTemperatureC: { min: number; max: number };
  interfacialPressureNMm2: { min: number; max: number };
  tolerances: {
    temperatureGradientC: number;
    misalignmentPct: number;
    beadSymmetryPct: number;
  };
  qualificationRequired: boolean;
  dataLoggerRequired: boolean;
  applications: string[];
}

export const WELDING_STANDARDS: Record<WeldingStandardCode, WeldingStandard> = {
  ASTM_F2620: {
    code: "ASTM_F2620",
    name: "ASTM F2620",
    fullName: "Standard Practice for Heat Fusion Joining of Polyethylene Pipe and Fittings",
    region: "US",
    description:
      "US standard for butt fusion of PE pipe, uses Single High Pressure (SHP) procedure",
    procedureTypes: ["SHP"],
    heatPlateTemperatureC: { min: 215, max: 235 },
    interfacialPressureNMm2: { min: 0.3, max: 0.4 },
    tolerances: {
      temperatureGradientC: 5,
      misalignmentPct: 10,
      beadSymmetryPct: 15,
    },
    qualificationRequired: true,
    dataLoggerRequired: true,
    applications: ["Municipal water", "Gas distribution", "Industrial"],
  },
  ISO_21307: {
    code: "ISO_21307",
    name: "ISO 21307",
    fullName: "Plastics pipes and fittings - Butt fusion jointing procedures for PE",
    region: "Global",
    description:
      "International standard supporting Low Pressure (LP), Single High Pressure (SHP), and Dual Low Pressure (DLP) procedures",
    procedureTypes: ["LP", "SHP", "DLP"],
    heatPlateTemperatureC: { min: 200, max: 230 },
    interfacialPressureNMm2: { min: 0.1, max: 0.2 },
    tolerances: {
      temperatureGradientC: 10,
      misalignmentPct: 10,
      beadSymmetryPct: 20,
    },
    qualificationRequired: true,
    dataLoggerRequired: false,
    applications: ["Water systems", "Gas systems", "Industrial", "Mining"],
  },
  DVS_2207_1: {
    code: "DVS_2207_1",
    name: "DVS 2207-1",
    fullName:
      "Welding of thermoplastics - Heated tool welding of pipes, pipeline components and sheets made of PE",
    region: "EU",
    description:
      "German standard emphasizing low-force, low-pressure procedures for long joint life",
    procedureTypes: ["LP"],
    heatPlateTemperatureC: { min: 200, max: 250 },
    interfacialPressureNMm2: { min: 0.1, max: 0.2 },
    tolerances: {
      temperatureGradientC: 7,
      misalignmentPct: 10,
      beadSymmetryPct: 15,
    },
    qualificationRequired: true,
    dataLoggerRequired: false,
    applications: ["Industrial piping", "Chemical plants", "Offshore"],
  },
  DVS_2207_11: {
    code: "DVS_2207_11",
    name: "DVS 2207-11",
    fullName:
      "Welding of thermoplastics - Electrofusion of pipes and pipeline components made of PE",
    region: "EU",
    description: "German standard for electrofusion welding procedures",
    procedureTypes: ["LP"],
    heatPlateTemperatureC: { min: 0, max: 0 },
    interfacialPressureNMm2: { min: 0, max: 0 },
    tolerances: {
      temperatureGradientC: 0,
      misalignmentPct: 5,
      beadSymmetryPct: 0,
    },
    qualificationRequired: true,
    dataLoggerRequired: true,
    applications: ["Electrofusion fittings", "Service connections", "Repairs"],
  },
  WIS_4_32_08: {
    code: "WIS_4_32_08",
    name: "WIS 4-32-08",
    fullName: "Specification for the Fusion Jointing of Polyethylene Pressure Pipeline Systems",
    region: "UK",
    description: "UK Water Industry Specification for fusion jointing",
    procedureTypes: ["LP", "SHP"],
    heatPlateTemperatureC: { min: 200, max: 230 },
    interfacialPressureNMm2: { min: 0.15, max: 0.25 },
    tolerances: {
      temperatureGradientC: 10,
      misalignmentPct: 10,
      beadSymmetryPct: 15,
    },
    qualificationRequired: true,
    dataLoggerRequired: true,
    applications: ["UK water industry", "Potable water"],
  },
};

export const WELDING_STANDARD_LIST: WeldingStandardCode[] = [
  "ASTM_F2620",
  "ISO_21307",
  "DVS_2207_1",
  "DVS_2207_11",
  "WIS_4_32_08",
];

export interface WelderQualification {
  standard: string;
  code: string;
  description: string;
  validityYears: number;
  requalificationRequired: boolean;
}

export const WELDER_QUALIFICATIONS: WelderQualification[] = [
  {
    standard: "DVS 2210-1",
    code: "DVS 2210-1",
    description: "German qualification for plastic welders - butt fusion and electrofusion",
    validityYears: 2,
    requalificationRequired: true,
  },
  {
    standard: "ASME IX",
    code: "ASME IX",
    description: "US welding qualification standard",
    validityYears: 3,
    requalificationRequired: true,
  },
  {
    standard: "ISO 13950",
    code: "ISO 13950",
    description: "International qualification for PE fusion operators",
    validityYears: 2,
    requalificationRequired: true,
  },
];

export interface MachineCompliance {
  standard: string;
  description: string;
  requirements: string[];
}

export const MACHINE_COMPLIANCE_STANDARDS: MachineCompliance[] = [
  {
    standard: "ISO 12176-1",
    description: "Butt fusion machine requirements",
    requirements: [
      "Temperature control accuracy +/- 5C",
      "Pressure gauge calibration",
      "Data logging capability",
      "Heater plate planarity check",
    ],
  },
  {
    standard: "ISO 12176-2",
    description: "Electrofusion equipment requirements",
    requirements: [
      "Voltage control accuracy",
      "Barcode scanner functionality",
      "Fusion time accuracy",
      "Ambient temperature compensation",
    ],
  },
  {
    standard: "ASTM D8468",
    description: "US machine data logger requirements",
    requirements: [
      "Temperature recording",
      "Pressure recording",
      "Time stamping",
      "Joint identification",
    ],
  },
];

export interface FusionProcedureParameters {
  procedureType: FusionProcedureType;
  name: string;
  description: string;
  beadUpPressureNMm2: number;
  heatingPressureNMm2: number;
  fusionPressureNMm2: number;
  usesDragPressure: boolean;
}

export const FUSION_PROCEDURES: Record<FusionProcedureType, FusionProcedureParameters> = {
  SHP: {
    procedureType: "SHP",
    name: "Single High Pressure",
    description: "ASTM-style procedure with constant high pressure throughout",
    beadUpPressureNMm2: 0.35,
    heatingPressureNMm2: 0.35,
    fusionPressureNMm2: 0.35,
    usesDragPressure: false,
  },
  LP: {
    procedureType: "LP",
    name: "Low Pressure",
    description: "DVS/ISO-style procedure with reduced heating pressure",
    beadUpPressureNMm2: 0.15,
    heatingPressureNMm2: 0.02,
    fusionPressureNMm2: 0.15,
    usesDragPressure: true,
  },
  DLP: {
    procedureType: "DLP",
    name: "Dual Low Pressure",
    description: "ISO procedure for thick-walled pipes with two-stage pressure",
    beadUpPressureNMm2: 0.15,
    heatingPressureNMm2: 0.02,
    fusionPressureNMm2: 0.1,
    usesDragPressure: true,
  },
};

export const standardByCode = (code: WeldingStandardCode): WeldingStandard => {
  return WELDING_STANDARDS[code];
};

export const standardsForRegion = (region: WeldingStandardRegion): WeldingStandard[] => {
  return WELDING_STANDARD_LIST.map((code) => WELDING_STANDARDS[code]).filter(
    (std) => std.region === region || std.region === "Global",
  );
};

export const defaultStandardForRegion = (region: WeldingStandardRegion): WeldingStandardCode => {
  const regionDefaults: Record<WeldingStandardRegion, WeldingStandardCode> = {
    US: "ASTM_F2620",
    EU: "DVS_2207_1",
    UK: "WIS_4_32_08",
    Global: "ISO_21307",
  };
  return regionDefaults[region];
};

export interface StandardParameterComparison {
  standard: WeldingStandardCode;
  heatTempRange: string;
  pressure: string;
  procedure: string;
}

export const compareStandards = (): StandardParameterComparison[] => {
  return WELDING_STANDARD_LIST.filter((code) => code !== "DVS_2207_11").map((code) => {
    const std = WELDING_STANDARDS[code];
    return {
      standard: code,
      heatTempRange: `${std.heatPlateTemperatureC.min}-${std.heatPlateTemperatureC.max}C`,
      pressure: `${std.interfacialPressureNMm2.min}-${std.interfacialPressureNMm2.max} N/mm2`,
      procedure: std.procedureTypes.join(", "),
    };
  });
};
