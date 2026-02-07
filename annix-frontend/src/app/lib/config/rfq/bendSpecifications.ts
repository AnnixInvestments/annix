/**
 * Bend Specifications and Rules
 *
 * This module defines the rules and specifications for steel pipe bends based on
 * South African (SABS/SANS) and international (ASTM) standards.
 *
 * Key Standards:
 * - SANS 62 (SABS 62): Welded/seamless carbon steel pipes for threading, up to 150 NB
 * - SANS 719 (SABS 719): ERW carbon steel pipes for large bore, 200 NB and above
 * - ASTM A106: Seamless carbon steel pipes for high-temperature service
 *
 * Bend Types:
 * - Pulled Bends: Formed by heating and bending straight pipe (induction/mandrel bending)
 * - Segmented Bends: Fabricated by cutting pipe at angles and welding (miter bends)
 *
 * References:
 * - ASME B31.3 Process Piping (miter bend pressure calculations)
 * - ASME B16.49 Factory-Made Wrought Steel Buttwelding Induction Bends
 */

export type BendFabricationType = "pulled" | "segmented";

export type SteelStandardCategory =
  | "SABS_62"
  | "SABS_719"
  | "ASTM_A106"
  | "ASTM_A53"
  | "ASTM_A333"
  | "ASTM_A312"
  | "ASTM_A335"
  | "ASTM_A358"
  | "ASTM_A790"
  | "API_5L";

export interface SteelStandardBendRules {
  category: SteelStandardCategory;
  patterns: string[];
  allowedBendTypes: BendFabricationType[];
  minNominalBoreMm: number;
  maxNominalBoreMm: number;
  notes: string;
}

export interface Sabs719Grade {
  grade: "A" | "B" | "C";
  yieldStrengthMPa: number;
  tensileStrengthMPa: number;
  maxCarbonPercent: number;
  maxManganesePercent: number;
  maxPhosphorusPercent: number;
  maxSulphurPercent: number;
}

export interface Sabs62PipeClass {
  pipeClass: "medium" | "heavy";
  nominalBoreMm: number;
  outsideDiameterMm: number;
  wallThicknessMm: number;
  massPerMeterKg: number;
  hydrostaticTestPressureKPa: number;
  workingPressureWaterBar: number;
  workingPressureSteamBar: number;
}

export interface WallThinningResult {
  originalThicknessMm: number;
  extradosThicknessMm: number;
  intradosThicknessMm: number;
  thinningPercent: number;
  thickeningPercent: number;
  withinAcceptableLimit: boolean;
  maxAllowedThinningPercent: number;
}

export interface TestPressureResult {
  testPressureKPa: number;
  testPressureBar: number;
  workingPressureKPa: number;
  workingPressureBar: number;
  safetyFactor: number;
  yieldStrengthMPa: number;
  wallThicknessMm: number;
  outsideDiameterMm: number;
}

export interface SegmentedBendDerating {
  numberOfMiters: number;
  miterAngleDegrees: number;
  deratingFactor: number;
  effectivePressurePercent: number;
  notes: string;
}

/**
 * Steel Standard Bend Rules
 *
 * Defines which bend fabrication types are allowed for each steel specification.
 */
export const STEEL_STANDARD_BEND_RULES: SteelStandardBendRules[] = [
  {
    category: "SABS_62",
    patterns: ["SABS 62", "SANS 62"],
    allowedBendTypes: ["pulled"],
    minNominalBoreMm: 15,
    maxNominalBoreMm: 150,
    notes:
      "SABS 62 pipes are limited to 150 NB. Bends are typically pulled (formed by bending straight pipe sections). Segmented bends are not common due to small sizes and threading requirements.",
  },
  {
    category: "SABS_719",
    patterns: ["SABS 719", "SANS 719"],
    allowedBendTypes: ["pulled", "segmented"],
    minNominalBoreMm: 200,
    maxNominalBoreMm: 1200,
    notes:
      "SABS 719 covers large bore ERW pipes (200 NB+). Both pulled and segmented bends are allowed. Pulled bends preferred for higher pressure; segmented for cost-effective custom angles.",
  },
  {
    category: "ASTM_A106",
    patterns: ["ASTM A106", "ASME SA106", "A106"],
    allowedBendTypes: ["pulled"],
    minNominalBoreMm: 15,
    maxNominalBoreMm: 650,
    notes:
      "ASTM A106 is seamless carbon steel for high-temperature service. Only pulled bends are used to maintain seamless integrity. Segmented bends would introduce welds, compromising the seamless specification.",
  },
  {
    category: "ASTM_A53",
    patterns: ["ASTM A53", "ASME SA53", "A53"],
    allowedBendTypes: ["pulled", "segmented"],
    minNominalBoreMm: 15,
    maxNominalBoreMm: 650,
    notes:
      "ASTM A53 covers both seamless and welded pipes. Both bend types allowed, but pulled preferred for seamless grades.",
  },
  {
    category: "ASTM_A333",
    patterns: ["ASTM A333", "ASME SA333", "A333"],
    allowedBendTypes: ["pulled"],
    minNominalBoreMm: 15,
    maxNominalBoreMm: 650,
    notes:
      "ASTM A333 is for low-temperature service. Seamless specification requires pulled bends only.",
  },
  {
    category: "ASTM_A335",
    patterns: ["ASTM A335", "ASME SA335", "A335"],
    allowedBendTypes: ["pulled"],
    minNominalBoreMm: 15,
    maxNominalBoreMm: 650,
    notes:
      "ASTM A335 covers alloy steel pipes for high-temperature service. Seamless specification requires pulled bends.",
  },
  {
    category: "ASTM_A312",
    patterns: ["ASTM A312", "ASME SA312", "A312"],
    allowedBendTypes: ["pulled", "segmented"],
    minNominalBoreMm: 15,
    maxNominalBoreMm: 750,
    notes: "ASTM A312 stainless steel seamless and welded pipes. Both bend types allowed.",
  },
  {
    category: "ASTM_A358",
    patterns: ["ASTM A358", "ASME SA358", "A358"],
    allowedBendTypes: ["pulled", "segmented"],
    minNominalBoreMm: 200,
    maxNominalBoreMm: 900,
    notes: "ASTM A358 stainless steel welded pipes. Both bend types allowed.",
  },
  {
    category: "ASTM_A790",
    patterns: ["ASTM A790", "ASME SA790", "A790"],
    allowedBendTypes: ["pulled", "segmented"],
    minNominalBoreMm: 15,
    maxNominalBoreMm: 600,
    notes: "ASTM A790 duplex stainless steel. Both bend types allowed with proper procedures.",
  },
  {
    category: "API_5L",
    patterns: ["API 5L", "API5L"],
    allowedBendTypes: ["pulled", "segmented"],
    minNominalBoreMm: 15,
    maxNominalBoreMm: 1200,
    notes: "API 5L line pipe. Both bend types allowed for pipeline applications.",
  },
];

/**
 * SABS 719 Grade Mechanical Properties
 *
 * Based on SANS 719:2011 Edition 3.2
 */
export const SABS_719_GRADES: Sabs719Grade[] = [
  {
    grade: "A",
    yieldStrengthMPa: 195,
    tensileStrengthMPa: 310,
    maxCarbonPercent: 0.21,
    maxManganesePercent: 0.9,
    maxPhosphorusPercent: 0.04,
    maxSulphurPercent: 0.04,
  },
  {
    grade: "B",
    yieldStrengthMPa: 241,
    tensileStrengthMPa: 414,
    maxCarbonPercent: 0.26,
    maxManganesePercent: 1.2,
    maxPhosphorusPercent: 0.04,
    maxSulphurPercent: 0.02,
  },
  {
    grade: "C",
    yieldStrengthMPa: 290,
    tensileStrengthMPa: 414,
    maxCarbonPercent: 0.28,
    maxManganesePercent: 1.25,
    maxPhosphorusPercent: 0.04,
    maxSulphurPercent: 0.02,
  },
];

/**
 * SABS 62 Pipe Data - Medium and Heavy Class
 *
 * Based on SANS 62:2001/2013
 * All pipes hydraulically tested to 70 bar (7000 kPa)
 * Yield strength: 200 MPa minimum
 * Tensile strength: 300 MPa minimum
 */
export const SABS_62_PIPE_DATA: Sabs62PipeClass[] = [
  // Medium Class
  {
    pipeClass: "medium",
    nominalBoreMm: 15,
    outsideDiameterMm: 21.3,
    wallThicknessMm: 2.3,
    massPerMeterKg: 1.08,
    hydrostaticTestPressureKPa: 7000,
    workingPressureWaterBar: 70,
    workingPressureSteamBar: 35,
  },
  {
    pipeClass: "medium",
    nominalBoreMm: 20,
    outsideDiameterMm: 26.9,
    wallThicknessMm: 2.3,
    massPerMeterKg: 1.39,
    hydrostaticTestPressureKPa: 7000,
    workingPressureWaterBar: 70,
    workingPressureSteamBar: 35,
  },
  {
    pipeClass: "medium",
    nominalBoreMm: 25,
    outsideDiameterMm: 33.7,
    wallThicknessMm: 2.8,
    massPerMeterKg: 2.13,
    hydrostaticTestPressureKPa: 7000,
    workingPressureWaterBar: 70,
    workingPressureSteamBar: 35,
  },
  {
    pipeClass: "medium",
    nominalBoreMm: 32,
    outsideDiameterMm: 42.4,
    wallThicknessMm: 2.8,
    massPerMeterKg: 2.73,
    hydrostaticTestPressureKPa: 7000,
    workingPressureWaterBar: 70,
    workingPressureSteamBar: 35,
  },
  {
    pipeClass: "medium",
    nominalBoreMm: 40,
    outsideDiameterMm: 48.3,
    wallThicknessMm: 3.3,
    massPerMeterKg: 3.66,
    hydrostaticTestPressureKPa: 7000,
    workingPressureWaterBar: 70,
    workingPressureSteamBar: 35,
  },
  {
    pipeClass: "medium",
    nominalBoreMm: 50,
    outsideDiameterMm: 60.3,
    wallThicknessMm: 3.3,
    massPerMeterKg: 4.63,
    hydrostaticTestPressureKPa: 7000,
    workingPressureWaterBar: 60,
    workingPressureSteamBar: 30,
  },
  {
    pipeClass: "medium",
    nominalBoreMm: 65,
    outsideDiameterMm: 76.1,
    wallThicknessMm: 3.3,
    massPerMeterKg: 5.92,
    hydrostaticTestPressureKPa: 7000,
    workingPressureWaterBar: 60,
    workingPressureSteamBar: 30,
  },
  {
    pipeClass: "medium",
    nominalBoreMm: 80,
    outsideDiameterMm: 88.9,
    wallThicknessMm: 3.5,
    massPerMeterKg: 7.36,
    hydrostaticTestPressureKPa: 7000,
    workingPressureWaterBar: 60,
    workingPressureSteamBar: 30,
  },
  {
    pipeClass: "medium",
    nominalBoreMm: 100,
    outsideDiameterMm: 114.3,
    wallThicknessMm: 3.9,
    massPerMeterKg: 10.6,
    hydrostaticTestPressureKPa: 7000,
    workingPressureWaterBar: 50,
    workingPressureSteamBar: 25,
  },
  {
    pipeClass: "medium",
    nominalBoreMm: 125,
    outsideDiameterMm: 139.7,
    wallThicknessMm: 4.3,
    massPerMeterKg: 14.3,
    hydrostaticTestPressureKPa: 7000,
    workingPressureWaterBar: 50,
    workingPressureSteamBar: 25,
  },
  {
    pipeClass: "medium",
    nominalBoreMm: 150,
    outsideDiameterMm: 165.1,
    wallThicknessMm: 4.3,
    massPerMeterKg: 17.0,
    hydrostaticTestPressureKPa: 7000,
    workingPressureWaterBar: 50,
    workingPressureSteamBar: 25,
  },
  // Heavy Class
  {
    pipeClass: "heavy",
    nominalBoreMm: 15,
    outsideDiameterMm: 21.3,
    wallThicknessMm: 2.8,
    massPerMeterKg: 1.28,
    hydrostaticTestPressureKPa: 7000,
    workingPressureWaterBar: 80,
    workingPressureSteamBar: 40,
  },
  {
    pipeClass: "heavy",
    nominalBoreMm: 20,
    outsideDiameterMm: 26.9,
    wallThicknessMm: 2.8,
    massPerMeterKg: 1.66,
    hydrostaticTestPressureKPa: 7000,
    workingPressureWaterBar: 80,
    workingPressureSteamBar: 40,
  },
  {
    pipeClass: "heavy",
    nominalBoreMm: 25,
    outsideDiameterMm: 33.7,
    wallThicknessMm: 3.5,
    massPerMeterKg: 2.6,
    hydrostaticTestPressureKPa: 7000,
    workingPressureWaterBar: 80,
    workingPressureSteamBar: 40,
  },
  {
    pipeClass: "heavy",
    nominalBoreMm: 32,
    outsideDiameterMm: 42.4,
    wallThicknessMm: 3.5,
    massPerMeterKg: 3.35,
    hydrostaticTestPressureKPa: 7000,
    workingPressureWaterBar: 80,
    workingPressureSteamBar: 40,
  },
  {
    pipeClass: "heavy",
    nominalBoreMm: 40,
    outsideDiameterMm: 48.3,
    wallThicknessMm: 4.0,
    massPerMeterKg: 4.36,
    hydrostaticTestPressureKPa: 7000,
    workingPressureWaterBar: 80,
    workingPressureSteamBar: 40,
  },
  {
    pipeClass: "heavy",
    nominalBoreMm: 50,
    outsideDiameterMm: 60.3,
    wallThicknessMm: 4.0,
    massPerMeterKg: 5.54,
    hydrostaticTestPressureKPa: 7000,
    workingPressureWaterBar: 70,
    workingPressureSteamBar: 35,
  },
  {
    pipeClass: "heavy",
    nominalBoreMm: 65,
    outsideDiameterMm: 76.1,
    wallThicknessMm: 4.0,
    massPerMeterKg: 7.1,
    hydrostaticTestPressureKPa: 7000,
    workingPressureWaterBar: 70,
    workingPressureSteamBar: 35,
  },
  {
    pipeClass: "heavy",
    nominalBoreMm: 80,
    outsideDiameterMm: 88.9,
    wallThicknessMm: 4.3,
    massPerMeterKg: 8.95,
    hydrostaticTestPressureKPa: 7000,
    workingPressureWaterBar: 70,
    workingPressureSteamBar: 35,
  },
  {
    pipeClass: "heavy",
    nominalBoreMm: 100,
    outsideDiameterMm: 114.3,
    wallThicknessMm: 4.8,
    massPerMeterKg: 12.9,
    hydrostaticTestPressureKPa: 7000,
    workingPressureWaterBar: 60,
    workingPressureSteamBar: 30,
  },
  {
    pipeClass: "heavy",
    nominalBoreMm: 125,
    outsideDiameterMm: 139.7,
    wallThicknessMm: 4.8,
    massPerMeterKg: 16.0,
    hydrostaticTestPressureKPa: 7000,
    workingPressureWaterBar: 60,
    workingPressureSteamBar: 30,
  },
  {
    pipeClass: "heavy",
    nominalBoreMm: 150,
    outsideDiameterMm: 165.1,
    wallThicknessMm: 4.8,
    massPerMeterKg: 19.0,
    hydrostaticTestPressureKPa: 7000,
    workingPressureWaterBar: 60,
    workingPressureSteamBar: 30,
  },
];

/**
 * SABS 719 Hydrostatic Test Pressure Data
 *
 * Test pressures calculated using P = (2 × 0.75 × YS × t) / D
 * Values in kPa for Grade B (241 MPa) and Grade C (290 MPa)
 */
export const SABS_719_TEST_PRESSURES: Record<
  number,
  Record<number, { gradeB: number; gradeC: number }>
> = {
  // NB -> Wall Thickness -> Test Pressures
  200: {
    4.5: { gradeB: 7393, gradeC: 8896 },
    6.0: { gradeB: 9858, gradeC: 11862 },
    8.0: { gradeB: 13144, gradeC: 15816 },
    10.0: { gradeB: 16430, gradeC: 19770 },
  },
  250: {
    4.5: { gradeB: 5935, gradeC: 7141 },
    6.0: { gradeB: 7913, gradeC: 9522 },
    8.0: { gradeB: 10551, gradeC: 12696 },
    10.0: { gradeB: 13189, gradeC: 15870 },
  },
  300: {
    4.5: { gradeB: 5006, gradeC: 6023 },
    6.0: { gradeB: 6674, gradeC: 8031 },
    8.0: { gradeB: 8899, gradeC: 10708 },
    10.0: { gradeB: 11124, gradeC: 13385 },
  },
  350: {
    4.5: { gradeB: 4557, gradeC: 5484 },
    6.0: { gradeB: 6076, gradeC: 7311 },
    8.0: { gradeB: 8101, gradeC: 9749 },
    10.0: { gradeB: 10127, gradeC: 12186 },
  },
  400: {
    4.5: { gradeB: 3988, gradeC: 4798 },
    6.0: { gradeB: 5317, gradeC: 6398 },
    8.0: { gradeB: 7089, gradeC: 8530 },
    10.0: { gradeB: 8862, gradeC: 10663 },
  },
  450: {
    4.5: { gradeB: 3545, gradeC: 4266 },
    6.0: { gradeB: 4727, gradeC: 5688 },
    8.0: { gradeB: 6302, gradeC: 7583 },
    10.0: { gradeB: 7877, gradeC: 9479 },
  },
  500: {
    4.5: { gradeB: 3191, gradeC: 3839 },
    6.0: { gradeB: 4254, gradeC: 5119 },
    8.0: { gradeB: 5672, gradeC: 6825 },
    10.0: { gradeB: 7090, gradeC: 8531 },
  },
  600: {
    4.5: { gradeB: 2659, gradeC: 3199 },
    6.0: { gradeB: 3545, gradeC: 4266 },
    8.0: { gradeB: 4727, gradeC: 5688 },
    10.0: { gradeB: 5908, gradeC: 7109 },
  },
};

/**
 * Maximum allowed wall thinning percentage for pulled bends
 * Per ASME B16.49 and related codes
 */
export const MAX_ALLOWED_WALL_THINNING_PERCENT = 12.5;

/**
 * Segmented bend derating factors based on number of miters and angle
 * Per ASME B31.3 guidance
 */
export const SEGMENTED_BEND_DERATING: SegmentedBendDerating[] = [
  {
    numberOfMiters: 2,
    miterAngleDegrees: 22.5,
    deratingFactor: 0.95,
    effectivePressurePercent: 95,
    notes: "2 miters at 22.5° each for 45° bend",
  },
  {
    numberOfMiters: 2,
    miterAngleDegrees: 45,
    deratingFactor: 0.85,
    effectivePressurePercent: 85,
    notes: "2 miters at 45° each for 90° bend (not recommended)",
  },
  {
    numberOfMiters: 3,
    miterAngleDegrees: 15,
    deratingFactor: 0.92,
    effectivePressurePercent: 92,
    notes: "3 miters at 15° each for 45° bend",
  },
  {
    numberOfMiters: 3,
    miterAngleDegrees: 30,
    deratingFactor: 0.88,
    effectivePressurePercent: 88,
    notes: "3 miters at 30° each for 90° bend",
  },
  {
    numberOfMiters: 4,
    miterAngleDegrees: 22.5,
    deratingFactor: 0.9,
    effectivePressurePercent: 90,
    notes: "4 miters at 22.5° each for 90° bend",
  },
  {
    numberOfMiters: 5,
    miterAngleDegrees: 18,
    deratingFactor: 0.92,
    effectivePressurePercent: 92,
    notes: "5 miters at 18° each for 90° bend",
  },
  {
    numberOfMiters: 6,
    miterAngleDegrees: 15,
    deratingFactor: 0.93,
    effectivePressurePercent: 93,
    notes: "6 miters at 15° each for 90° bend",
  },
];

/**
 * Get the steel standard rules for a given specification name
 */
export const steelStandardBendRules = (steelSpecName: string): SteelStandardBendRules | null => {
  const upperName = steelSpecName.toUpperCase();
  return (
    STEEL_STANDARD_BEND_RULES.find((rule) => rule.patterns.some((p) => upperName.includes(p))) ||
    null
  );
};

/**
 * Check if a bend type is allowed for a given steel specification
 */
export const isBendTypeAllowed = (
  steelSpecName: string,
  bendType: BendFabricationType,
): boolean => {
  const rules = steelStandardBendRules(steelSpecName);
  if (!rules) return true;
  return rules.allowedBendTypes.includes(bendType);
};

/**
 * Get allowed bend types for a steel specification
 */
export const allowedBendTypes = (steelSpecName: string): BendFabricationType[] => {
  const rules = steelStandardBendRules(steelSpecName);
  return rules ? rules.allowedBendTypes : ["pulled", "segmented"];
};

/**
 * Check if NB is within valid range for a steel specification
 */
export const isNominalBoreValidForSpec = (
  steelSpecName: string,
  nominalBoreMm: number,
): boolean => {
  const rules = steelStandardBendRules(steelSpecName);
  if (!rules) return true;
  return nominalBoreMm >= rules.minNominalBoreMm && nominalBoreMm <= rules.maxNominalBoreMm;
};

/**
 * Get SABS 719 grade properties
 */
export const sabs719GradeProperties = (grade: "A" | "B" | "C"): Sabs719Grade | null => {
  return SABS_719_GRADES.find((g) => g.grade === grade) || null;
};

/**
 * Get SABS 62 pipe data for a given NB and class
 */
export const sabs62PipeData = (
  nominalBoreMm: number,
  pipeClass: "medium" | "heavy",
): Sabs62PipeClass | null => {
  return (
    SABS_62_PIPE_DATA.find((p) => p.nominalBoreMm === nominalBoreMm && p.pipeClass === pipeClass) ||
    null
  );
};

/**
 * Calculate hydrostatic test pressure
 *
 * Formula: P = (2 × 0.75 × YS × t) / D
 * Where:
 *   P = test pressure (kPa)
 *   YS = yield strength (MPa)
 *   t = wall thickness (mm)
 *   D = outside diameter (mm)
 *
 * The 0.75 factor ensures the test stresses the steel to 75% of minimum yield
 */
export const calculateTestPressure = (
  yieldStrengthMPa: number,
  wallThicknessMm: number,
  outsideDiameterMm: number,
): TestPressureResult => {
  const testPressureKPa = (2 * 0.75 * yieldStrengthMPa * wallThicknessMm) / outsideDiameterMm;
  const testPressureBar = testPressureKPa / 100;
  const safetyFactor = 2.5;
  const workingPressureKPa = testPressureKPa / safetyFactor;
  const workingPressureBar = workingPressureKPa / 100;

  return {
    testPressureKPa: Math.round(testPressureKPa),
    testPressureBar: Math.round(testPressureBar * 10) / 10,
    workingPressureKPa: Math.round(workingPressureKPa),
    workingPressureBar: Math.round(workingPressureBar * 10) / 10,
    safetyFactor,
    yieldStrengthMPa,
    wallThicknessMm,
    outsideDiameterMm,
  };
};

/**
 * Calculate wall thinning for pulled bends (induction/hot bending)
 *
 * The extrados (outside of bend curve) thins while intrados (inside) thickens.
 *
 * Formulas:
 *   R_extrados = R1 + OD/2 - T/2
 *   R_intrados = R1 - OD/2 + T/2
 *   T_extrados = T × R1 / R_extrados
 *   T_intrados = T × R1 / R_intrados
 *   Thinning % = (1 - R1/R_extrados) × 100
 *   Thickening % = (R1/R_intrados - 1) × 100
 *
 * Where:
 *   R1 = bend centerline radius (mm)
 *   OD = pipe outside diameter (mm)
 *   T = original wall thickness (mm)
 */
export const calculateWallThinning = (
  bendRadiusMm: number,
  outsideDiameterMm: number,
  wallThicknessMm: number,
): WallThinningResult => {
  const R1 = bendRadiusMm;
  const OD = outsideDiameterMm;
  const T = wallThicknessMm;

  const R_extrados = R1 + OD / 2 - T / 2;
  const R_intrados = R1 - OD / 2 + T / 2;

  const T_extrados = (T * R1) / R_extrados;
  const T_intrados = (T * R1) / R_intrados;

  const thinningPercent = (1 - R1 / R_extrados) * 100;
  const thickeningPercent = (R1 / R_intrados - 1) * 100;

  return {
    originalThicknessMm: T,
    extradosThicknessMm: Math.round(T_extrados * 100) / 100,
    intradosThicknessMm: Math.round(T_intrados * 100) / 100,
    thinningPercent: Math.round(thinningPercent * 10) / 10,
    thickeningPercent: Math.round(thickeningPercent * 10) / 10,
    withinAcceptableLimit: thinningPercent <= MAX_ALLOWED_WALL_THINNING_PERCENT,
    maxAllowedThinningPercent: MAX_ALLOWED_WALL_THINNING_PERCENT,
  };
};

/**
 * Get segmented bend derating factor
 *
 * Returns the pressure derating factor based on number of miters.
 * More miters = smaller angles = better pressure retention.
 */
export const segmentedBendDeratingFactor = (
  numberOfSegments: number,
  totalAngleDegrees: number,
): number => {
  if (numberOfSegments <= 1) return 1.0;

  const numberOfMiters = numberOfSegments - 1;
  const miterAngle = totalAngleDegrees / numberOfSegments;

  const matchingDerating = SEGMENTED_BEND_DERATING.find(
    (d) => d.numberOfMiters === numberOfMiters && Math.abs(d.miterAngleDegrees - miterAngle) < 5,
  );

  if (matchingDerating) {
    return matchingDerating.deratingFactor;
  }

  if (miterAngle > 22.5) {
    return 0.8;
  }
  if (miterAngle > 15) {
    return 0.88;
  }
  return 0.92;
};

/**
 * Get effective pressure rating for a segmented bend
 */
export const effectivePressureForSegmentedBend = (
  basePressureBar: number,
  numberOfSegments: number,
  totalAngleDegrees: number,
): number => {
  const derating = segmentedBendDeratingFactor(numberOfSegments, totalAngleDegrees);
  return Math.round(basePressureBar * derating * 10) / 10;
};

/**
 * Determine if a bend should be pulled or segmented based on specifications
 *
 * Returns recommendation based on:
 * - Steel specification rules
 * - Pipe size
 * - Desired bend angle
 * - Pressure requirements
 */
export const recommendedBendType = (
  steelSpecName: string,
  nominalBoreMm: number,
  bendAngleDegrees: number,
  workingPressureBar: number,
): { recommended: BendFabricationType; reason: string } => {
  const rules = steelStandardBendRules(steelSpecName);

  if (rules && rules.allowedBendTypes.length === 1) {
    return {
      recommended: rules.allowedBendTypes[0],
      reason: `${rules.category} specification only allows ${rules.allowedBendTypes[0]} bends`,
    };
  }

  if (workingPressureBar > 25) {
    return {
      recommended: "pulled",
      reason: "Pulled bends recommended for pressures above 25 bar due to better integrity",
    };
  }

  if (nominalBoreMm <= 150) {
    return {
      recommended: "pulled",
      reason: "Pulled bends preferred for smaller diameters (150 NB and below)",
    };
  }

  if (bendAngleDegrees > 90) {
    return {
      recommended: "segmented",
      reason: "Segmented bends more practical for angles greater than 90°",
    };
  }

  if (nominalBoreMm >= 400) {
    return {
      recommended: "segmented",
      reason: "Segmented bends often more cost-effective for large diameters (400 NB+)",
    };
  }

  return {
    recommended: "pulled",
    reason:
      "Pulled bends generally preferred for better flow characteristics and pressure retention",
  };
};
