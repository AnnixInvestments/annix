/**
 * Pipe Calculation Formulas and Utilities
 *
 * This file contains standard formulas for carbon steel pipe calculations.
 * These formulas are used throughout the application for weight, radius,
 * and surface area calculations.
 */

/**
 * Calculate weight per meter for carbon steel pipes and fittings
 * Formula: ((OD - WT) * WT) * 0.02466 = Kg/m
 *
 * @param outsideDiameterMm - Outside diameter in millimeters
 * @param wallThicknessMm - Wall thickness in millimeters
 * @returns Weight per meter in kg/m
 *
 * @example
 * // For a 500NB Sch40 pipe (OD=508mm, WT=15.09mm):
 * // (508 - 15.09) * 15.09 * 0.02466 = 183.42 kg/m
 * calculatePipeWeightPerMeter(508, 15.09) // Returns 183.42
 */
export function calculatePipeWeightPerMeter(
  outsideDiameterMm: number,
  wallThicknessMm: number
): number {
  return ((outsideDiameterMm - wallThicknessMm) * wallThicknessMm) * 0.02466;
}

/**
 * Calculate bend radius
 * Formula: (NB_inches * 25.4) * bend_type_multiplier = Radius in mm
 *
 * @param nominalBoreInches - Nominal bore in inches
 * @param bendTypeMultiplier - Bend type (1.5D, 2D, 3D, 5D etc.)
 * @returns Bend radius in millimeters
 *
 * @example
 * // For a 200NB (8") 3D bend:
 * // 8 * 25.4 * 3 = 609.6mm
 * calculateBendRadius(8, 3) // Returns 609.6
 */
export function calculateBendRadius(
  nominalBoreInches: number,
  bendTypeMultiplier: number
): number {
  return (nominalBoreInches * 25.4) * bendTypeMultiplier;
}

/**
 * Convert NB mm to inches
 * Common conversions for standard pipe sizes
 */
export function nbMmToInches(nbMm: number): number {
  // Standard NB conversions
  const conversionMap: Record<number, number> = {
    15: 0.5, 20: 0.75, 25: 1, 32: 1.25, 40: 1.5, 50: 2, 65: 2.5, 80: 3,
    100: 4, 125: 5, 150: 6, 200: 8, 250: 10, 300: 12, 350: 14, 400: 16,
    450: 18, 500: 20, 600: 24, 700: 28, 750: 30, 800: 32, 900: 36, 1000: 40,
    1050: 42, 1200: 48
  };
  return conversionMap[nbMm] || nbMm / 25.4;
}

/**
 * Calculate surface area for external paint
 * Formula: (OD * π) * overall_length = m²
 *
 * @param outsideDiameterMm - Outside diameter in millimeters
 * @param overallLengthM - Overall length in meters
 * @returns Surface area in square meters
 *
 * @example
 * // For a 450NB pipe 6m long (OD ≈ 457.2mm):
 * // (0.4572 * 3.14159) * 6 = 8.62 m²
 * calculateExternalPaintArea(457.2, 6) // Returns ~8.62
 */
export function calculateExternalPaintArea(
  outsideDiameterMm: number,
  overallLengthM: number
): number {
  const outsideDiameterM = outsideDiameterMm / 1000;
  return (outsideDiameterM * Math.PI) * overallLengthM;
}

/**
 * Calculate surface area for internal rubber lining
 * Formula: (ID * π) * (overall_length + (number_of_flanges * 0.1)) = m²
 *
 * @param insideDiameterMm - Inside diameter in millimeters
 * @param overallLengthM - Overall length in meters
 * @param numberOfFlanges - Number of flanges (adds 0.1m per flange for lining overlap)
 * @returns Surface area in square meters
 *
 * @example
 * // For a 450NB pipe 6m long with 2 flanges (ID ≈ 438mm):
 * // (0.438 * 3.14159) * (6 + 0.2) = 8.53 m²
 * calculateInternalLiningArea(438, 6, 2) // Returns ~8.53
 */
export function calculateInternalLiningArea(
  insideDiameterMm: number,
  overallLengthM: number,
  numberOfFlanges: number = 0
): number {
  const insideDiameterM = insideDiameterMm / 1000;
  const effectiveLength = overallLengthM + (numberOfFlanges * 0.1);
  return (insideDiameterM * Math.PI) * effectiveLength;
}

/**
 * Calculate weight of rubber lining
 * Formula: ((thickness * width) * length) * SG = Kg
 *
 * @param thicknessMm - Rubber thickness in millimeters
 * @param widthM - Width in meters
 * @param lengthM - Length in meters
 * @param specificGravity - Specific gravity of the rubber compound
 * @returns Weight in kilograms
 *
 * @example
 * // For AU 40 Shore Red Natural Rubber (SG 1.05):
 * // 6mm x 1.2m x 12m = ((6/1000) * 1.2) * 12 * 1.05 = 90.72 kg
 * // Note: thickness must be in meters for this calculation
 * calculateRubberWeight(6, 1.2, 12, 1.05) // Returns ~90.72
 */
export function calculateRubberWeight(
  thicknessMm: number,
  widthM: number,
  lengthM: number,
  specificGravity: number
): number {
  const thicknessM = thicknessMm / 1000;
  return ((thicknessM * widthM) * lengthM) * specificGravity * 1000;
}

/**
 * Standard rubber specific gravities for common compounds
 */
export const RUBBER_SPECIFIC_GRAVITIES: Record<string, number> = {
  'Natural Rubber': 1.05,
  'Neoprene': 1.25,
  'Nitrile (NBR)': 1.15,
  'EPDM': 1.10,
  'Butyl': 1.15,
  'Viton': 1.80,
  'Silicone': 1.15,
  'Hypalon': 1.25,
};

/**
 * Calculate inside diameter from outside diameter and wall thickness
 */
export function calculateInsideDiameter(
  outsideDiameterMm: number,
  wallThicknessMm: number
): number {
  return outsideDiameterMm - (2 * wallThicknessMm);
}

// ============================================================================
// ASME B31.3 PRESSURE CALCULATIONS
// ============================================================================

/**
 * Allowable stress values for common carbon steel materials (MPa)
 * Based on ASME B31.3 at ambient/moderate temperatures
 *
 * Note: These values are for seamless pipe (E=1.0)
 * For ERW pipe, multiply by joint efficiency factor (typically 0.85)
 */
export const MATERIAL_ALLOWABLE_STRESS: Record<string, {
  stressMPa: number;
  description: string;
  temperatureLimit: number; // Max temp in °C before significant derating
}> = {
  'ASTM_A53_Grade_B': {
    stressMPa: 138,
    description: 'ASTM A53 Grade B - ERW/Seamless Carbon Steel',
    temperatureLimit: 200,
  },
  'ASTM_A106_Grade_B': {
    stressMPa: 138,
    description: 'ASTM A106 Grade B - Seamless Carbon Steel (High Temp)',
    temperatureLimit: 400,
  },
  'ASTM_A333_Grade_6': {
    stressMPa: 138,
    description: 'ASTM A333 Grade 6 - Low Temperature Carbon Steel',
    temperatureLimit: 200,
  },
  'ASTM_A312_TP304': {
    stressMPa: 115,
    description: 'ASTM A312 TP304 - Stainless Steel',
    temperatureLimit: 500,
  },
  'ASTM_A312_TP316': {
    stressMPa: 115,
    description: 'ASTM A312 TP316 - Stainless Steel',
    temperatureLimit: 500,
  },
};

/**
 * Temperature derating factors for carbon steel (ASME B31.3)
 * Values are approximate - actual values should be from code tables
 */
export const TEMPERATURE_DERATING: Record<number, number> = {
  20: 1.00,   // Ambient - no derating
  50: 1.00,   // Still within ambient range
  100: 0.98,  // Slight reduction
  150: 0.95,  // 5% reduction
  200: 0.92,  // 8% reduction
  250: 0.88,  // 12% reduction
  300: 0.83,  // 17% reduction
  350: 0.77,  // 23% reduction
  400: 0.70,  // 30% reduction
};

/**
 * Get temperature derating factor with interpolation
 */
export function getTemperatureDerating(temperatureC: number): number {
  const temps = Object.keys(TEMPERATURE_DERATING).map(Number).sort((a, b) => a - b);

  if (temperatureC <= temps[0]) return TEMPERATURE_DERATING[temps[0]];
  if (temperatureC >= temps[temps.length - 1]) return TEMPERATURE_DERATING[temps[temps.length - 1]];

  // Find surrounding temperatures and interpolate
  for (let i = 0; i < temps.length - 1; i++) {
    if (temperatureC >= temps[i] && temperatureC <= temps[i + 1]) {
      const ratio = (temperatureC - temps[i]) / (temps[i + 1] - temps[i]);
      return TEMPERATURE_DERATING[temps[i]] + ratio * (TEMPERATURE_DERATING[temps[i + 1]] - TEMPERATURE_DERATING[temps[i]]);
    }
  }

  return 1.0;
}

/**
 * Calculate maximum allowable pressure for a pipe per ASME B31.3
 *
 * Formula: P = (2 × S × E × t) / OD
 *
 * Where:
 * - P = Maximum allowable internal pressure (MPa)
 * - S = Allowable stress at design temperature (MPa)
 * - E = Joint efficiency factor (1.0 for seamless, 0.85 for ERW)
 * - t = Wall thickness (mm)
 * - OD = Outside diameter (mm)
 *
 * @param outsideDiameterMm - Outside diameter in mm
 * @param wallThicknessMm - Wall thickness in mm
 * @param materialCode - Material code (e.g., 'ASTM_A106_Grade_B')
 * @param temperatureC - Design temperature in Celsius (default 20°C)
 * @param jointEfficiency - Joint efficiency factor (default 1.0 for seamless)
 * @param corrosionAllowanceMm - Corrosion allowance in mm (default 0)
 * @returns Maximum allowable pressure in bar
 *
 * @example
 * // 500NB Sch 10 (OD=508mm, WT=6.35mm) ASTM A106 Grade B:
 * // P = (2 × 138 × 1.0 × 6.35) / 508 = 3.45 MPa = 34.5 bar
 * calculateMaxAllowablePressure(508, 6.35, 'ASTM_A106_Grade_B') // Returns ~34.5 bar
 */
export function calculateMaxAllowablePressure(
  outsideDiameterMm: number,
  wallThicknessMm: number,
  materialCode: string = 'ASTM_A106_Grade_B',
  temperatureC: number = 20,
  jointEfficiency: number = 1.0,
  corrosionAllowanceMm: number = 0
): number {
  const material = MATERIAL_ALLOWABLE_STRESS[materialCode] || MATERIAL_ALLOWABLE_STRESS['ASTM_A106_Grade_B'];
  const tempDerating = getTemperatureDerating(temperatureC);

  // Effective wall thickness after corrosion allowance
  const effectiveWT = wallThicknessMm - corrosionAllowanceMm;

  // Derated allowable stress
  const allowableStress = material.stressMPa * tempDerating;

  // ASME B31.3 pressure formula: P = (2 × S × E × t) / OD
  const pressureMPa = (2 * allowableStress * jointEfficiency * effectiveWT) / outsideDiameterMm;

  // Convert MPa to bar (1 MPa = 10 bar)
  return pressureMPa * 10;
}

/**
 * Calculate minimum required wall thickness for a given pressure per ASME B31.3
 *
 * Formula: t = (P × OD) / (2 × S × E) + corrosion_allowance
 *
 * @param outsideDiameterMm - Outside diameter in mm
 * @param pressureBar - Design pressure in bar
 * @param materialCode - Material code (e.g., 'ASTM_A106_Grade_B')
 * @param temperatureC - Design temperature in Celsius (default 20°C)
 * @param jointEfficiency - Joint efficiency factor (default 1.0 for seamless)
 * @param corrosionAllowanceMm - Corrosion allowance in mm (default 0)
 * @param safetyFactor - Additional safety factor (default 1.0)
 * @returns Minimum required wall thickness in mm
 *
 * @example
 * // 500NB at 16 bar, ASTM A106 Grade B:
 * // t = (1.6 × 508) / (2 × 138 × 1.0) = 2.94 mm
 * calculateMinWallThickness(508, 16, 'ASTM_A106_Grade_B') // Returns ~2.94 mm
 */
export function calculateMinWallThickness(
  outsideDiameterMm: number,
  pressureBar: number,
  materialCode: string = 'ASTM_A106_Grade_B',
  temperatureC: number = 20,
  jointEfficiency: number = 1.0,
  corrosionAllowanceMm: number = 0,
  safetyFactor: number = 1.0
): number {
  const material = MATERIAL_ALLOWABLE_STRESS[materialCode] || MATERIAL_ALLOWABLE_STRESS['ASTM_A106_Grade_B'];
  const tempDerating = getTemperatureDerating(temperatureC);

  // Derated allowable stress
  const allowableStress = material.stressMPa * tempDerating;

  // Convert bar to MPa (1 bar = 0.1 MPa)
  const pressureMPa = pressureBar * 0.1;

  // ASME B31.3 wall thickness formula: t = (P × OD) / (2 × S × E)
  const minWT = (pressureMPa * outsideDiameterMm * safetyFactor) / (2 * allowableStress * jointEfficiency);

  // Add corrosion allowance
  return minWT + corrosionAllowanceMm;
}

/**
 * Validate if a schedule is acceptable for the given pressure
 *
 * @param outsideDiameterMm - Outside diameter in mm
 * @param wallThicknessMm - Wall thickness in mm
 * @param workingPressureBar - Working pressure in bar
 * @param materialCode - Material code
 * @param temperatureC - Design temperature in Celsius
 * @returns Validation result with details
 */
export function validateScheduleForPressure(
  outsideDiameterMm: number,
  wallThicknessMm: number,
  workingPressureBar: number,
  materialCode: string = 'ASTM_A106_Grade_B',
  temperatureC: number = 20
): {
  isAcceptable: boolean;
  maxAllowablePressure: number;
  minRequiredWT: number;
  safetyMargin: number;
  message: string;
} {
  const maxPressure = calculateMaxAllowablePressure(
    outsideDiameterMm,
    wallThicknessMm,
    materialCode,
    temperatureC
  );

  const minWT = calculateMinWallThickness(
    outsideDiameterMm,
    workingPressureBar,
    materialCode,
    temperatureC
  );

  const safetyMargin = maxPressure / workingPressureBar;
  const isAcceptable = maxPressure >= workingPressureBar;

  let message: string;
  if (isAcceptable) {
    if (safetyMargin >= 2) {
      message = `Excellent: ${safetyMargin.toFixed(1)}x safety margin (max ${maxPressure.toFixed(1)} bar)`;
    } else if (safetyMargin >= 1.5) {
      message = `Good: ${safetyMargin.toFixed(1)}x safety margin (max ${maxPressure.toFixed(1)} bar)`;
    } else {
      message = `Acceptable: ${safetyMargin.toFixed(1)}x safety margin - consider thicker schedule for longevity`;
    }
  } else {
    message = `NOT ACCEPTABLE: Max pressure ${maxPressure.toFixed(1)} bar < required ${workingPressureBar} bar. Need min ${minWT.toFixed(2)}mm wall thickness.`;
  }

  return {
    isAcceptable,
    maxAllowablePressure: maxPressure,
    minRequiredWT: minWT,
    safetyMargin,
    message,
  };
}

/**
 * Find the recommended schedule from available options
 *
 * @param schedules - Array of available schedules with wall thickness
 * @param outsideDiameterMm - Outside diameter in mm
 * @param workingPressureBar - Working pressure in bar
 * @param materialCode - Material code
 * @param temperatureC - Design temperature in Celsius
 * @param minSafetyFactor - Minimum safety factor (default 1.2 for code margin)
 * @returns Recommended schedule or null if none suitable
 */
export function findRecommendedSchedule(
  schedules: Array<{ scheduleDesignation: string; wallThicknessMm: number }>,
  outsideDiameterMm: number,
  workingPressureBar: number,
  materialCode: string = 'ASTM_A106_Grade_B',
  temperatureC: number = 20,
  minSafetyFactor: number = 1.2
): {
  schedule: { scheduleDesignation: string; wallThicknessMm: number } | null;
  validation: ReturnType<typeof validateScheduleForPressure> | null;
  eligibleSchedules: Array<{
    schedule: { scheduleDesignation: string; wallThicknessMm: number };
    validation: ReturnType<typeof validateScheduleForPressure>;
  }>;
} {
  const minWT = calculateMinWallThickness(
    outsideDiameterMm,
    workingPressureBar,
    materialCode,
    temperatureC,
    1.0,
    0,
    minSafetyFactor
  );

  // Find all eligible schedules that meet minimum wall thickness
  const eligibleSchedules = schedules
    .map(schedule => ({
      schedule,
      validation: validateScheduleForPressure(
        outsideDiameterMm,
        schedule.wallThicknessMm,
        workingPressureBar,
        materialCode,
        temperatureC
      ),
    }))
    .filter(item => item.validation.isAcceptable && item.validation.safetyMargin >= minSafetyFactor)
    .sort((a, b) => a.schedule.wallThicknessMm - b.schedule.wallThicknessMm);

  if (eligibleSchedules.length === 0) {
    return {
      schedule: null,
      validation: null,
      eligibleSchedules: [],
    };
  }

  // Return the lightest (thinnest) acceptable schedule
  return {
    schedule: eligibleSchedules[0].schedule,
    validation: eligibleSchedules[0].validation,
    eligibleSchedules,
  };
}

// ============================================================================
// COMPREHENSIVE ASME B31.3 PRESSURE CALCULATION DATA
// ============================================================================

/**
 * ASME B31.3 Full Formula for Maximum Allowable Working Pressure (MAWP)
 *
 * P = (2 * S * E * (t - c)) / (D_o - 2 * y * (t - c))
 *
 * Where:
 * - P: Maximum allowable gauge pressure (psi or bar)
 * - S: Basic allowable stress at operating temperature (ksi or MPa)
 * - E: Longitudinal joint efficiency (1.0 seamless, 0.95 EFW, 0.85 ERW)
 * - t: Nominal wall thickness (inches or mm)
 * - c: Corrosion/mechanical allowance (typically 1.6mm or project-specific)
 * - D_o: Outside diameter (inches or mm)
 * - y: Temperature coefficient (0.4 for ferritic steels below 482°C)
 *
 * For thin-walled pipes (t < D_o/6), simplifies to Barlow's formula:
 * P ≈ (2 * S * E * t) / D_o
 */

/**
 * Joint efficiency factors per ASME B31.3 Table A-1B
 */
export const JOINT_EFFICIENCY: Record<string, number> = {
  'Seamless': 1.0,
  'Electric Fusion Welded': 0.95,
  'Electric Resistance Welded': 0.85,
  'Furnace Butt Welded': 0.60,
  // Shorthand codes
  'SMLS': 1.0,
  'EFW': 0.95,
  'ERW': 0.85,
  'FBW': 0.60,
};

/**
 * Temperature coefficient (y) per ASME B31.3 para. 304.1.1
 * For ferritic steels and austenitic stainless steels
 */
export const TEMPERATURE_COEFFICIENT_Y: Record<string, number> = {
  // Temperature ranges in °F for ferritic steels
  'below_900F': 0.4,   // Below 482°C
  '950F': 0.5,         // 510°C
  '1050F_and_above': 0.7,  // 566°C and above
  // Celsius equivalents
  'below_482C': 0.4,
  '510C': 0.5,
  '566C_and_above': 0.7,
};

/**
 * Get y coefficient based on temperature
 */
export function getYCoefficient(temperatureC: number): number {
  if (temperatureC < 482) return 0.4;
  if (temperatureC < 566) return 0.5;
  return 0.7;
}

/**
 * Comprehensive material allowable stress tables per ASME B31.3
 * Stress values in ksi (kilo-pounds per square inch)
 * Temperature ranges in °F
 *
 * Note: These are for seamless pipe (E=1.0). Apply joint efficiency for welded.
 */
export const ASME_MATERIAL_STRESS_TABLES: Record<string, {
  type: string;
  maxTempF: number;
  maxTempC: number;
  allowableStressKsi: Record<string, number>;
  allowableStressMPa?: Record<string, number>;
}> = {
  'ASTM_A106_Gr_B': {
    type: 'Carbon Steel',
    maxTempF: 800,
    maxTempC: 427,
    allowableStressKsi: {
      '-20_to_400': 20.0,
      '500': 19.2,
      '600': 17.5,
      '650': 16.6,
      '700': 15.7,
      '750': 13.0,
      '800': 9.3,
    },
  },
  'ASTM_A53_Gr_B': {
    type: 'Carbon Steel',
    maxTempF: 750,
    maxTempC: 400,
    allowableStressKsi: {
      '-20_to_400': 20.0,
      '500': 19.2,
      '600': 17.5,
      '650': 16.6,
      '700': 15.7,
      '750': 13.0,
    },
  },
  'API_5L_Gr_B': {
    type: 'Line Pipe Carbon Steel',
    maxTempF: 750,
    maxTempC: 400,
    allowableStressKsi: {
      '-20_to_400': 20.0,
      '500': 19.2,
      '600': 17.5,
      '650': 16.6,
      '700': 15.7,
      '750': 13.0,
    },
  },
  'ASTM_A333_Gr_6': {
    type: 'Low-Temp Carbon Steel',
    maxTempF: 750,
    maxTempC: 400,
    allowableStressKsi: {
      '-50_to_400': 20.0,
      '500': 19.2,
      '600': 17.5,
      '650': 16.6,
      '700': 15.7,
      '750': 13.0,
    },
  },
  'ASTM_A312_TP304': {
    type: 'Stainless Steel',
    maxTempF: 1500,
    maxTempC: 816,
    allowableStressKsi: {
      '-20_to_100': 20.0,
      '200': 20.0,
      '300': 18.9,
      '400': 17.5,
      '500': 16.3,
      '600': 15.3,
      '700': 14.6,
      '800': 14.0,
      '900': 13.5,
      '1000': 9.7,
      '1100': 6.0,
      '1200': 3.7,
      '1300': 2.4,
      '1400': 1.6,
      '1500': 1.1,
    },
  },
  'ASTM_A312_TP316': {
    type: 'Stainless Steel',
    maxTempF: 1500,
    maxTempC: 816,
    allowableStressKsi: {
      '-20_to_100': 20.0,
      '200': 20.0,
      '300': 20.0,
      '400': 18.9,
      '500': 17.9,
      '600': 17.0,
      '700': 16.4,
      '800': 15.9,
      '900': 15.4,
      '1000': 12.4,
      '1100': 8.1,
      '1200': 5.2,
      '1300': 3.4,
      '1400': 2.2,
      '1500': 1.4,
    },
  },
  'ASTM_A335_P11': {
    type: 'Alloy Steel (1.25Cr-0.5Mo)',
    maxTempF: 1200,
    maxTempC: 649,
    allowableStressKsi: {
      '-20_to_100': 20.0,
      '200': 20.0,
      '300': 19.3,
      '400': 18.7,
      '500': 18.3,
      '600': 18.0,
      '700': 17.7,
      '800': 17.2,
      '900': 16.3,
      '1000': 14.3,
      '1050': 12.8,
      '1100': 10.7,
      '1150': 8.3,
      '1200': 6.3,
    },
  },
  'ASTM_A335_P22': {
    type: 'Alloy Steel (2.25Cr-1Mo)',
    maxTempF: 1200,
    maxTempC: 649,
    allowableStressKsi: {
      '-20_to_100': 20.0,
      '200': 20.0,
      '300': 19.3,
      '400': 18.7,
      '500': 18.3,
      '600': 18.0,
      '700': 17.7,
      '800': 17.2,
      '900': 16.3,
      '1000': 14.3,
      '1050': 12.8,
      '1100': 10.7,
      '1150': 8.3,
      '1200': 6.3,
    },
  },
};

/**
 * Material code mapping for different naming conventions
 */
export const MATERIAL_CODE_MAPPING: Record<string, string> = {
  // Standard names to internal codes
  'ASTM A106 Grade B': 'ASTM_A106_Gr_B',
  'ASTM A106 Gr B': 'ASTM_A106_Gr_B',
  'A106 Gr B': 'ASTM_A106_Gr_B',
  'A106B': 'ASTM_A106_Gr_B',
  'ASTM A53 Grade B': 'ASTM_A53_Gr_B',
  'ASTM A53 Gr B': 'ASTM_A53_Gr_B',
  'A53 Gr B': 'ASTM_A53_Gr_B',
  'A53B': 'ASTM_A53_Gr_B',
  'API 5L Grade B': 'API_5L_Gr_B',
  'API 5L Gr B': 'API_5L_Gr_B',
  '5L Gr B': 'API_5L_Gr_B',
  'ASTM A333 Grade 6': 'ASTM_A333_Gr_6',
  'ASTM A333 Gr 6': 'ASTM_A333_Gr_6',
  'A333 Gr 6': 'ASTM_A333_Gr_6',
  'ASTM A312 TP304': 'ASTM_A312_TP304',
  'A312 TP304': 'ASTM_A312_TP304',
  '304 SS': 'ASTM_A312_TP304',
  '304SS': 'ASTM_A312_TP304',
  'ASTM A312 TP316': 'ASTM_A312_TP316',
  'A312 TP316': 'ASTM_A312_TP316',
  '316 SS': 'ASTM_A312_TP316',
  '316SS': 'ASTM_A312_TP316',
  'ASTM A335 P11': 'ASTM_A335_P11',
  'A335 P11': 'ASTM_A335_P11',
  'P11': 'ASTM_A335_P11',
  'ASTM A335 P22': 'ASTM_A335_P22',
  'A335 P22': 'ASTM_A335_P22',
  'P22': 'ASTM_A335_P22',
  // Legacy codes
  'ASTM_A53_Grade_B': 'ASTM_A53_Gr_B',
  'ASTM_A106_Grade_B': 'ASTM_A106_Gr_B',
  'ASTM_A333_Grade_6': 'ASTM_A333_Gr_6',
};

/**
 * Get allowable stress for material at temperature (in ksi)
 * Uses interpolation for temperatures between table values
 */
export function getAllowableStressKsi(
  materialCode: string,
  temperatureF: number
): number {
  // Normalize material code
  const normalizedCode = MATERIAL_CODE_MAPPING[materialCode] || materialCode;
  const material = ASME_MATERIAL_STRESS_TABLES[normalizedCode];

  if (!material) {
    console.warn(`Material ${materialCode} not found, using ASTM A106 Gr B defaults`);
    return getAllowableStressKsi('ASTM_A106_Gr_B', temperatureF);
  }

  const stressTable = material.allowableStressKsi;

  // Parse temperature ranges and find applicable stress
  const entries = Object.entries(stressTable).map(([key, value]) => {
    if (key.includes('_to_')) {
      const [low, high] = key.split('_to_').map(Number);
      return { low, high, value };
    }
    return { low: Number(key), high: Number(key), value };
  }).sort((a, b) => a.high - b.high);

  // Find matching range or interpolate
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    if (temperatureF <= entry.high) {
      // Check if within range
      if (temperatureF >= entry.low) {
        return entry.value;
      }
      // Before first range, use first value
      if (i === 0) {
        return entry.value;
      }
      // Interpolate between previous and current
      const prev = entries[i - 1];
      const ratio = (temperatureF - prev.high) / (entry.low - prev.high);
      return prev.value + ratio * (entry.value - prev.value);
    }
  }

  // Beyond last temperature, return last value (or could throw error)
  return entries[entries.length - 1].value;
}

/**
 * Get allowable stress for material at temperature (in MPa)
 */
export function getAllowableStressMPa(
  materialCode: string,
  temperatureC: number
): number {
  // Convert Celsius to Fahrenheit
  const temperatureF = (temperatureC * 9/5) + 32;
  // Get stress in ksi and convert to MPa (1 ksi = 6.895 MPa)
  return getAllowableStressKsi(materialCode, temperatureF) * 6.895;
}

/**
 * Comprehensive pipe dimension data per ASME B36.10M
 * Wall thickness in inches, OD in inches
 */
export interface PipeDimension {
  npsIn: string;      // NPS in inches (e.g., "20" for NPS 20)
  nbMm: number;       // Nominal bore in mm
  odIn: number;       // Outside diameter in inches
  odMm: number;       // Outside diameter in mm
  schedulesWallIn: Record<string, number>;  // Schedule -> wall thickness in inches
}

export const PIPE_DIMENSIONS: PipeDimension[] = [
  {
    npsIn: '1/2',
    nbMm: 15,
    odIn: 0.84,
    odMm: 21.3,
    schedulesWallIn: {
      '5': 0.065, '5S': 0.065,
      '10': 0.083, '10S': 0.083,
      '30': 0.095,
      '40': 0.109, '40S': 0.109, 'STD': 0.109,
      '80': 0.147, '80S': 0.147, 'XS': 0.147,
      '160': 0.188,
      'XXS': 0.294,
    },
  },
  {
    npsIn: '3/4',
    nbMm: 20,
    odIn: 1.05,
    odMm: 26.7,
    schedulesWallIn: {
      '5': 0.065, '5S': 0.065,
      '10': 0.083, '10S': 0.083,
      '30': 0.095,
      '40': 0.113, '40S': 0.113, 'STD': 0.113,
      '80': 0.154, '80S': 0.154, 'XS': 0.154,
      '160': 0.219,
      'XXS': 0.308,
    },
  },
  {
    npsIn: '1',
    nbMm: 25,
    odIn: 1.315,
    odMm: 33.4,
    schedulesWallIn: {
      '5': 0.065, '5S': 0.065,
      '10': 0.109, '10S': 0.109,
      '30': 0.114,
      '40': 0.133, '40S': 0.133, 'STD': 0.133,
      '80': 0.179, '80S': 0.179, 'XS': 0.179,
      '160': 0.25,
      'XXS': 0.358,
    },
  },
  {
    npsIn: '1 1/4',
    nbMm: 32,
    odIn: 1.66,
    odMm: 42.2,
    schedulesWallIn: {
      '5': 0.065, '5S': 0.065,
      '10': 0.109, '10S': 0.109,
      '30': 0.117,
      '40': 0.14, '40S': 0.14, 'STD': 0.14,
      '80': 0.191, '80S': 0.191, 'XS': 0.191,
      '160': 0.25,
      'XXS': 0.382,
    },
  },
  {
    npsIn: '1 1/2',
    nbMm: 40,
    odIn: 1.9,
    odMm: 48.3,
    schedulesWallIn: {
      '5': 0.065, '5S': 0.065,
      '10': 0.109, '10S': 0.109,
      '30': 0.125,
      '40': 0.145, '40S': 0.145, 'STD': 0.145,
      '80': 0.2, '80S': 0.2, 'XS': 0.2,
      '160': 0.281,
      'XXS': 0.4,
    },
  },
  {
    npsIn: '2',
    nbMm: 50,
    odIn: 2.375,
    odMm: 60.3,
    schedulesWallIn: {
      '5': 0.065, '5S': 0.065,
      '10': 0.109, '10S': 0.109,
      '30': 0.125,
      '40': 0.154, '40S': 0.154, 'STD': 0.154,
      '80': 0.218, '80S': 0.218, 'XS': 0.218,
      '160': 0.344,
      'XXS': 0.436,
    },
  },
  {
    npsIn: '2 1/2',
    nbMm: 65,
    odIn: 2.875,
    odMm: 73.0,
    schedulesWallIn: {
      '5': 0.083, '5S': 0.083,
      '10': 0.12, '10S': 0.12,
      '30': 0.188,
      '40': 0.203, '40S': 0.203, 'STD': 0.203,
      '80': 0.276, '80S': 0.276, 'XS': 0.276,
      '160': 0.375,
      'XXS': 0.552,
    },
  },
  {
    npsIn: '3',
    nbMm: 80,
    odIn: 3.5,
    odMm: 88.9,
    schedulesWallIn: {
      '5': 0.083, '5S': 0.083,
      '10': 0.12, '10S': 0.12,
      '30': 0.188,
      '40': 0.216, '40S': 0.216, 'STD': 0.216,
      '80': 0.3, '80S': 0.3, 'XS': 0.3,
      '160': 0.438,
      'XXS': 0.6,
    },
  },
  {
    npsIn: '4',
    nbMm: 100,
    odIn: 4.5,
    odMm: 114.3,
    schedulesWallIn: {
      '5': 0.083, '5S': 0.083,
      '10': 0.12, '10S': 0.12,
      '30': 0.188,
      '40': 0.237, '40S': 0.237, 'STD': 0.237,
      '80': 0.337, '80S': 0.337, 'XS': 0.337,
      '120': 0.438,
      '160': 0.531,
      'XXS': 0.674,
    },
  },
  {
    npsIn: '5',
    nbMm: 125,
    odIn: 5.563,
    odMm: 141.3,
    schedulesWallIn: {
      '5': 0.109, '5S': 0.109,
      '10': 0.134, '10S': 0.134,
      '40': 0.258, '40S': 0.258, 'STD': 0.258,
      '80': 0.375, '80S': 0.375, 'XS': 0.375,
      '120': 0.5,
      '160': 0.625,
      'XXS': 0.75,
    },
  },
  {
    npsIn: '6',
    nbMm: 150,
    odIn: 6.625,
    odMm: 168.3,
    schedulesWallIn: {
      '5': 0.109, '5S': 0.109,
      '10': 0.134, '10S': 0.134,
      '40': 0.28, '40S': 0.28, 'STD': 0.28,
      '80': 0.432, '80S': 0.432, 'XS': 0.432,
      '120': 0.562,
      '160': 0.719,
      'XXS': 0.864,
    },
  },
  {
    npsIn: '8',
    nbMm: 200,
    odIn: 8.625,
    odMm: 219.1,
    schedulesWallIn: {
      '5': 0.109, '5S': 0.109,
      '10': 0.148, '10S': 0.148,
      '20': 0.25,
      '30': 0.277,
      '40': 0.322, '40S': 0.322, 'STD': 0.322,
      '60': 0.406,
      '80': 0.5, '80S': 0.5, 'XS': 0.5,
      '100': 0.594,
      '120': 0.719,
      '140': 0.812,
      '160': 0.906,
      'XXS': 0.875,
    },
  },
  {
    npsIn: '10',
    nbMm: 250,
    odIn: 10.75,
    odMm: 273.1,
    schedulesWallIn: {
      '5': 0.134, '5S': 0.134,
      '10': 0.165, '10S': 0.165,
      '20': 0.25,
      '30': 0.307,
      '40': 0.365, '40S': 0.365, 'STD': 0.365,
      '60': 0.5,
      '80': 0.594, '80S': 0.5, 'XS': 0.5,
      '100': 0.719,
      '120': 0.844,
      '140': 0.938,
      '160': 1.031,
      'XXS': 0.875,
    },
  },
  {
    npsIn: '12',
    nbMm: 300,
    odIn: 12.75,
    odMm: 323.9,
    schedulesWallIn: {
      '5': 0.165, '5S': 0.165,
      '10': 0.18, '10S': 0.18,
      '20': 0.25,
      '30': 0.33,
      '40': 0.375, 'STD': 0.375,
      '40S': 0.406,
      '60': 0.562,
      '80': 0.688, '80S': 0.5, 'XS': 0.5,
      '100': 0.812,
      '120': 0.938,
      '140': 1.0,
      '160': 1.125,
      'XXS': 1.0,
    },
  },
  {
    npsIn: '14',
    nbMm: 350,
    odIn: 14.0,
    odMm: 355.6,
    schedulesWallIn: {
      '5': 0.156,
      '10': 0.188, '10S': 0.25,
      '20': 0.312,
      '30': 0.375, 'STD': 0.375,
      '40': 0.438,
      'XS': 0.5,
      '60': 0.594,
      '80': 0.75,
      '100': 0.938,
      '120': 1.094,
      '140': 1.25,
      '160': 1.406,
    },
  },
  {
    npsIn: '16',
    nbMm: 400,
    odIn: 16.0,
    odMm: 406.4,
    schedulesWallIn: {
      '5': 0.165,
      '10': 0.188, '10S': 0.25,
      '20': 0.312,
      '30': 0.375, 'STD': 0.375,
      '40': 0.5, 'XS': 0.5,
      '60': 0.656,
      '80': 0.844,
      '100': 1.031,
      '120': 1.219,
      '140': 1.438,
      '160': 1.594,
    },
  },
  {
    npsIn: '18',
    nbMm: 450,
    odIn: 18.0,
    odMm: 457.0,
    schedulesWallIn: {
      '5': 0.165,
      '10': 0.188, '10S': 0.25,
      '20': 0.312,
      '30': 0.438, 'STD': 0.375,
      '40': 0.562, 'XS': 0.5,
      '60': 0.75,
      '80': 0.938,
      '100': 1.156,
      '120': 1.375,
      '140': 1.562,
      '160': 1.781,
    },
  },
  {
    npsIn: '20',
    nbMm: 500,
    odIn: 20.0,
    odMm: 508.0,
    schedulesWallIn: {
      '5': 0.188,
      '10': 0.25, '10S': 0.25,
      '20': 0.375, 'STD': 0.375,
      '30': 0.5, 'XS': 0.5,
      '40': 0.594,
      '60': 0.812,
      '80': 1.031,
      '100': 1.281,
      '120': 1.5,
      '140': 1.75,
      '160': 1.969,
    },
  },
  {
    npsIn: '24',
    nbMm: 600,
    odIn: 24.0,
    odMm: 610.0,
    schedulesWallIn: {
      '5': 0.218,
      '10': 0.25, '10S': 0.25,
      '20': 0.375, 'STD': 0.375,
      '30': 0.562, 'XS': 0.5,
      '40': 0.688,
      '60': 0.969,
      '80': 1.219,
      '100': 1.531,
      '120': 1.812,
      '140': 2.062,
      '160': 2.344,
    },
  },
  {
    npsIn: '30',
    nbMm: 750,
    odIn: 30.0,
    odMm: 762.0,
    schedulesWallIn: {
      '5': 0.25,
      '10': 0.312, '10S': 0.312,
      '20': 0.5,
      '30': 0.625, 'STD': 0.375, 'XS': 0.5,
      '40': 0.75,
      '60': 1.0,
      '80': 1.25,
    },
  },
  {
    npsIn: '36',
    nbMm: 900,
    odIn: 36.0,
    odMm: 914.0,
    schedulesWallIn: {
      '10': 0.312, '10S': 0.312,
      '20': 0.5,
      '30': 0.625, 'STD': 0.375, 'XS': 0.5,
      '40': 0.75,
    },
  },
  {
    npsIn: '42',
    nbMm: 1050,
    odIn: 42.0,
    odMm: 1067.0,
    schedulesWallIn: {
      '10': 0.312, '10S': 0.312,
      '20': 0.5,
      '30': 0.625, 'STD': 0.375, 'XS': 0.5,
    },
  },
  {
    npsIn: '48',
    nbMm: 1200,
    odIn: 48.0,
    odMm: 1219.0,
    schedulesWallIn: {
      '5': 0.25,
      '10': 0.375, '10S': 0.375,
      '20': 0.562,
      '30': 0.688, 'STD': 0.375, 'XS': 0.5,
    },
  },
];

/**
 * Get pipe dimension by NB (mm)
 */
export function getPipeDimensionByNb(nbMm: number): PipeDimension | undefined {
  return PIPE_DIMENSIONS.find(p => p.nbMm === nbMm);
}

/**
 * Get wall thickness for a specific NB and schedule (in mm)
 */
export function getWallThicknessMm(nbMm: number, schedule: string): number | undefined {
  const pipe = getPipeDimensionByNb(nbMm);
  if (!pipe) return undefined;

  // Normalize schedule name
  const normalizedSchedule = normalizeScheduleName(schedule);
  const wallIn = pipe.schedulesWallIn[normalizedSchedule];

  if (wallIn === undefined) return undefined;

  // Convert inches to mm (1 inch = 25.4 mm)
  return wallIn * 25.4;
}

/**
 * Normalize schedule name to match table keys
 */
export function normalizeScheduleName(schedule: string): string {
  // Remove common prefixes and variations
  let normalized = schedule
    .replace(/^Sch\s*/i, '')
    .replace(/^Schedule\s*/i, '')
    .replace(/\/STD$/i, '')
    .replace(/\/XS$/i, '')
    .trim();

  // Handle Sch 40/STD type names
  if (schedule.toLowerCase().includes('std')) return 'STD';
  if (schedule.toLowerCase().includes('xs') && !schedule.toLowerCase().includes('xxs')) return 'XS';
  if (schedule.toLowerCase().includes('xxs')) return 'XXS';

  return normalized;
}

/**
 * Calculate MAWP using full ASME B31.3 formula with y-factor
 *
 * P = (2 * S * E * (t - c)) / (D_o - 2 * y * (t - c))
 *
 * @param params Calculation parameters
 * @returns MAWP in bar and additional calculation details
 */
export function calculateMAWP(params: {
  nbMm: number;
  schedule: string;
  materialCode: string;
  temperatureC: number;
  jointType?: 'Seamless' | 'ERW' | 'EFW';
  corrosionAllowanceMm?: number;
}): {
  mawpBar: number;
  mawpPsi: number;
  wallThicknessMm: number;
  outsideDiameterMm: number;
  allowableStressMPa: number;
  allowableStressKsi: number;
  jointEfficiency: number;
  yCoefficient: number;
  effectiveWallMm: number;
  formula: string;
  isValid: boolean;
  message: string;
} {
  const { nbMm, schedule, materialCode, temperatureC, jointType = 'Seamless', corrosionAllowanceMm = 0 } = params;

  // Get pipe dimensions
  const pipe = getPipeDimensionByNb(nbMm);
  if (!pipe) {
    return {
      mawpBar: 0,
      mawpPsi: 0,
      wallThicknessMm: 0,
      outsideDiameterMm: 0,
      allowableStressMPa: 0,
      allowableStressKsi: 0,
      jointEfficiency: 1.0,
      yCoefficient: 0.4,
      effectiveWallMm: 0,
      formula: 'P = (2 * S * E * (t - c)) / (D_o - 2 * y * (t - c))',
      isValid: false,
      message: `Pipe NB ${nbMm}mm not found in dimension table`,
    };
  }

  // Get wall thickness
  const wallThicknessMm = getWallThicknessMm(nbMm, schedule);
  if (!wallThicknessMm) {
    return {
      mawpBar: 0,
      mawpPsi: 0,
      wallThicknessMm: 0,
      outsideDiameterMm: pipe.odMm,
      allowableStressMPa: 0,
      allowableStressKsi: 0,
      jointEfficiency: 1.0,
      yCoefficient: 0.4,
      effectiveWallMm: 0,
      formula: 'P = (2 * S * E * (t - c)) / (D_o - 2 * y * (t - c))',
      isValid: false,
      message: `Schedule ${schedule} not available for NB ${nbMm}mm`,
    };
  }

  const outsideDiameterMm = pipe.odMm;
  const jointEfficiency = JOINT_EFFICIENCY[jointType] || 1.0;
  const yCoefficient = getYCoefficient(temperatureC);

  // Get allowable stress
  const temperatureF = (temperatureC * 9/5) + 32;
  const allowableStressKsi = getAllowableStressKsi(materialCode, temperatureF);
  const allowableStressMPa = allowableStressKsi * 6.895;

  // Effective wall thickness after corrosion allowance
  const effectiveWallMm = wallThicknessMm - corrosionAllowanceMm;

  if (effectiveWallMm <= 0) {
    return {
      mawpBar: 0,
      mawpPsi: 0,
      wallThicknessMm,
      outsideDiameterMm,
      allowableStressMPa,
      allowableStressKsi,
      jointEfficiency,
      yCoefficient,
      effectiveWallMm,
      formula: 'P = (2 * S * E * (t - c)) / (D_o - 2 * y * (t - c))',
      isValid: false,
      message: `Corrosion allowance (${corrosionAllowanceMm}mm) exceeds wall thickness (${wallThicknessMm}mm)`,
    };
  }

  // Check if thin-walled (t < D_o/6) - use simplified Barlow's formula
  const isThinWalled = effectiveWallMm < outsideDiameterMm / 6;

  let mawpMPa: number;
  let formula: string;

  if (isThinWalled) {
    // Simplified Barlow's formula: P = (2 * S * E * t) / D_o
    mawpMPa = (2 * allowableStressMPa * jointEfficiency * effectiveWallMm) / outsideDiameterMm;
    formula = `P = (2 × ${allowableStressMPa.toFixed(1)} × ${jointEfficiency} × ${effectiveWallMm.toFixed(2)}) / ${outsideDiameterMm} = ${(mawpMPa * 10).toFixed(1)} bar (Barlow's)`;
  } else {
    // Full ASME B31.3 formula: P = (2 * S * E * (t - c)) / (D_o - 2 * y * (t - c))
    mawpMPa = (2 * allowableStressMPa * jointEfficiency * effectiveWallMm) /
              (outsideDiameterMm - 2 * yCoefficient * effectiveWallMm);
    formula = `P = (2 × ${allowableStressMPa.toFixed(1)} × ${jointEfficiency} × ${effectiveWallMm.toFixed(2)}) / (${outsideDiameterMm} - 2 × ${yCoefficient} × ${effectiveWallMm.toFixed(2)}) = ${(mawpMPa * 10).toFixed(1)} bar`;
  }

  // Convert to bar and psi
  const mawpBar = mawpMPa * 10;  // 1 MPa = 10 bar
  const mawpPsi = mawpBar * 14.504;  // 1 bar = 14.504 psi

  return {
    mawpBar,
    mawpPsi,
    wallThicknessMm,
    outsideDiameterMm,
    allowableStressMPa,
    allowableStressKsi,
    jointEfficiency,
    yCoefficient,
    effectiveWallMm,
    formula,
    isValid: true,
    message: `MAWP: ${mawpBar.toFixed(1)} bar (${mawpPsi.toFixed(0)} psi) for ${nbMm}NB ${schedule} ${materialCode} at ${temperatureC}°C`,
  };
}

/**
 * Find suitable schedules for a given NB, material, temperature, and required pressure
 * Returns schedules sorted from lightest (thinnest) to heaviest
 */
export function findSuitableSchedules(params: {
  nbMm: number;
  materialCode: string;
  temperatureC: number;
  requiredPressureBar: number;
  jointType?: 'Seamless' | 'ERW' | 'EFW';
  corrosionAllowanceMm?: number;
  minSafetyFactor?: number;
}): Array<{
  schedule: string;
  wallThicknessMm: number;
  mawpBar: number;
  safetyFactor: number;
  isRecommended: boolean;
}> {
  const { nbMm, materialCode, temperatureC, requiredPressureBar, jointType = 'Seamless', corrosionAllowanceMm = 0, minSafetyFactor = 1.2 } = params;

  const pipe = getPipeDimensionByNb(nbMm);
  if (!pipe) return [];

  const results: Array<{
    schedule: string;
    wallThicknessMm: number;
    mawpBar: number;
    safetyFactor: number;
    isRecommended: boolean;
  }> = [];

  // Test each available schedule
  for (const [schedule, wallIn] of Object.entries(pipe.schedulesWallIn)) {
    // Skip duplicate schedule names (e.g., '40' and '40S')
    if (schedule.endsWith('S') && pipe.schedulesWallIn[schedule.slice(0, -1)]) continue;

    const mawpResult = calculateMAWP({
      nbMm,
      schedule,
      materialCode,
      temperatureC,
      jointType,
      corrosionAllowanceMm,
    });

    if (!mawpResult.isValid) continue;

    const safetyFactor = mawpResult.mawpBar / requiredPressureBar;

    if (safetyFactor >= minSafetyFactor) {
      results.push({
        schedule,
        wallThicknessMm: mawpResult.wallThicknessMm,
        mawpBar: mawpResult.mawpBar,
        safetyFactor,
        isRecommended: false,
      });
    }
  }

  // Sort by wall thickness (lightest first)
  results.sort((a, b) => a.wallThicknessMm - b.wallThicknessMm);

  // Mark the lightest suitable schedule as recommended
  if (results.length > 0) {
    results[0].isRecommended = true;
  }

  return results;
}

/**
 * Validate if a schedule selection is appropriate for the given conditions
 */
export function validateScheduleSelection(params: {
  nbMm: number;
  schedule: string;
  materialCode: string;
  temperatureC: number;
  requiredPressureBar: number;
  jointType?: 'Seamless' | 'ERW' | 'EFW';
  corrosionAllowanceMm?: number;
}): {
  isValid: boolean;
  isAcceptable: boolean;
  mawpBar: number;
  safetyFactor: number;
  message: string;
  recommendation?: string;
  calculationDetails: ReturnType<typeof calculateMAWP>;
} {
  const mawpResult = calculateMAWP(params);

  if (!mawpResult.isValid) {
    return {
      isValid: false,
      isAcceptable: false,
      mawpBar: 0,
      safetyFactor: 0,
      message: mawpResult.message,
      calculationDetails: mawpResult,
    };
  }

  const safetyFactor = mawpResult.mawpBar / params.requiredPressureBar;
  const isAcceptable = safetyFactor >= 1.0;

  let message: string;
  let recommendation: string | undefined;

  if (!isAcceptable) {
    message = `Schedule ${params.schedule} is NOT suitable: MAWP ${mawpResult.mawpBar.toFixed(1)} bar < required ${params.requiredPressureBar} bar`;

    // Find a suitable alternative
    const alternatives = findSuitableSchedules({
      ...params,
      minSafetyFactor: 1.2,
    });

    if (alternatives.length > 0) {
      recommendation = `Recommend: ${alternatives[0].schedule} (MAWP ${alternatives[0].mawpBar.toFixed(1)} bar, ${alternatives[0].safetyFactor.toFixed(1)}x safety factor)`;
    } else {
      recommendation = `No standard schedule available for ${params.nbMm}NB at ${params.requiredPressureBar} bar. Consider thicker custom wall or different material.`;
    }
  } else if (safetyFactor < 1.2) {
    message = `Schedule ${params.schedule} is MARGINAL: ${safetyFactor.toFixed(2)}x safety factor (< 1.2x recommended)`;

    const alternatives = findSuitableSchedules({
      ...params,
      minSafetyFactor: 1.2,
    });

    if (alternatives.length > 0 && alternatives[0].schedule !== params.schedule) {
      recommendation = `Consider upgrading to: ${alternatives[0].schedule} (${alternatives[0].safetyFactor.toFixed(1)}x safety factor)`;
    }
  } else if (safetyFactor >= 2.0) {
    message = `Schedule ${params.schedule} is EXCELLENT: ${safetyFactor.toFixed(1)}x safety factor`;
  } else if (safetyFactor >= 1.5) {
    message = `Schedule ${params.schedule} is GOOD: ${safetyFactor.toFixed(1)}x safety factor`;
  } else {
    message = `Schedule ${params.schedule} is ACCEPTABLE: ${safetyFactor.toFixed(1)}x safety factor`;
  }

  return {
    isValid: true,
    isAcceptable,
    mawpBar: mawpResult.mawpBar,
    safetyFactor,
    message,
    recommendation,
    calculationDetails: mawpResult,
  };
}

// ============================================================================
// SURFACE AREA CALCULATIONS FOR SURFACE PROTECTION
// ============================================================================

/**
 * Standard ANSI B16.5 Flange Dimensions (Class 150)
 * Common for most industrial applications
 * All dimensions in mm
 */
export interface FlangeDimensions {
  dn: number;          // Nominal diameter (mm)
  flangeOdMm: number;  // Flange outside diameter
  boreIdMm: number;    // Bore ID (matches pipe ID approximately)
  raisedFaceDiaMm: number;  // Raised face diameter (for RF flanges)
  hubLengthMm: number; // Hub/neck length for weld neck flanges
}

export const ANSI_B165_CLASS_150_FLANGES: FlangeDimensions[] = [
  { dn: 15, flangeOdMm: 89, boreIdMm: 15.8, raisedFaceDiaMm: 34.9, hubLengthMm: 22 },
  { dn: 20, flangeOdMm: 98, boreIdMm: 20.9, raisedFaceDiaMm: 42.9, hubLengthMm: 25 },
  { dn: 25, flangeOdMm: 108, boreIdMm: 26.6, raisedFaceDiaMm: 50.8, hubLengthMm: 27 },
  { dn: 32, flangeOdMm: 117, boreIdMm: 35.1, raisedFaceDiaMm: 63.5, hubLengthMm: 29 },
  { dn: 40, flangeOdMm: 127, boreIdMm: 40.9, raisedFaceDiaMm: 73.0, hubLengthMm: 30 },
  { dn: 50, flangeOdMm: 152, boreIdMm: 52.5, raisedFaceDiaMm: 92.1, hubLengthMm: 33 },
  { dn: 65, flangeOdMm: 178, boreIdMm: 62.7, raisedFaceDiaMm: 104.8, hubLengthMm: 36 },
  { dn: 80, flangeOdMm: 191, boreIdMm: 77.9, raisedFaceDiaMm: 127.0, hubLengthMm: 38 },
  { dn: 100, flangeOdMm: 229, boreIdMm: 102.3, raisedFaceDiaMm: 157.2, hubLengthMm: 41 },
  { dn: 125, flangeOdMm: 254, boreIdMm: 128.2, raisedFaceDiaMm: 185.7, hubLengthMm: 44 },
  { dn: 150, flangeOdMm: 279, boreIdMm: 154.1, raisedFaceDiaMm: 215.9, hubLengthMm: 48 },
  { dn: 200, flangeOdMm: 343, boreIdMm: 202.7, raisedFaceDiaMm: 269.9, hubLengthMm: 54 },
  { dn: 250, flangeOdMm: 406, boreIdMm: 254.5, raisedFaceDiaMm: 323.8, hubLengthMm: 60 },
  { dn: 300, flangeOdMm: 483, boreIdMm: 304.8, raisedFaceDiaMm: 381.0, hubLengthMm: 67 },
  { dn: 350, flangeOdMm: 533, boreIdMm: 336.6, raisedFaceDiaMm: 412.8, hubLengthMm: 70 },
  { dn: 400, flangeOdMm: 597, boreIdMm: 387.4, raisedFaceDiaMm: 469.9, hubLengthMm: 76 },
  { dn: 450, flangeOdMm: 635, boreIdMm: 438.2, raisedFaceDiaMm: 533.4, hubLengthMm: 83 },
  { dn: 500, flangeOdMm: 699, boreIdMm: 489.0, raisedFaceDiaMm: 584.2, hubLengthMm: 89 },
  { dn: 600, flangeOdMm: 813, boreIdMm: 590.6, raisedFaceDiaMm: 692.2, hubLengthMm: 102 },
  { dn: 750, flangeOdMm: 978, boreIdMm: 742.9, raisedFaceDiaMm: 857.2, hubLengthMm: 127 },
  { dn: 900, flangeOdMm: 1117, boreIdMm: 895.4, raisedFaceDiaMm: 1009.6, hubLengthMm: 152 },
  { dn: 1000, flangeOdMm: 1219, boreIdMm: 996.9, raisedFaceDiaMm: 1111.2, hubLengthMm: 165 },
  { dn: 1050, flangeOdMm: 1270, boreIdMm: 1047.8, raisedFaceDiaMm: 1162.0, hubLengthMm: 178 },
  { dn: 1200, flangeOdMm: 1422, boreIdMm: 1200.2, raisedFaceDiaMm: 1314.4, hubLengthMm: 203 },
];

// ASME B16.5 Class 300 Flange Dimensions
export const ANSI_B165_CLASS_300_FLANGES: FlangeDimensions[] = [
  { dn: 15, flangeOdMm: 95, boreIdMm: 15.8, raisedFaceDiaMm: 34.9, hubLengthMm: 38 },
  { dn: 20, flangeOdMm: 117, boreIdMm: 20.9, raisedFaceDiaMm: 42.9, hubLengthMm: 48 },
  { dn: 25, flangeOdMm: 124, boreIdMm: 26.6, raisedFaceDiaMm: 50.8, hubLengthMm: 52 },
  { dn: 32, flangeOdMm: 133, boreIdMm: 35.1, raisedFaceDiaMm: 63.5, hubLengthMm: 57 },
  { dn: 40, flangeOdMm: 156, boreIdMm: 40.9, raisedFaceDiaMm: 73.0, hubLengthMm: 62 },
  { dn: 50, flangeOdMm: 165, boreIdMm: 52.5, raisedFaceDiaMm: 92.1, hubLengthMm: 67 },
  { dn: 65, flangeOdMm: 190, boreIdMm: 62.7, raisedFaceDiaMm: 104.8, hubLengthMm: 73 },
  { dn: 80, flangeOdMm: 210, boreIdMm: 77.9, raisedFaceDiaMm: 127.0, hubLengthMm: 79 },
  { dn: 100, flangeOdMm: 254, boreIdMm: 102.3, raisedFaceDiaMm: 157.2, hubLengthMm: 86 },
  { dn: 125, flangeOdMm: 279, boreIdMm: 128.2, raisedFaceDiaMm: 185.7, hubLengthMm: 92 },
  { dn: 150, flangeOdMm: 318, boreIdMm: 154.1, raisedFaceDiaMm: 215.9, hubLengthMm: 98 },
  { dn: 200, flangeOdMm: 381, boreIdMm: 202.7, raisedFaceDiaMm: 269.9, hubLengthMm: 117 },
  { dn: 250, flangeOdMm: 444, boreIdMm: 254.5, raisedFaceDiaMm: 323.8, hubLengthMm: 133 },
  { dn: 300, flangeOdMm: 521, boreIdMm: 304.8, raisedFaceDiaMm: 381.0, hubLengthMm: 152 },
  { dn: 350, flangeOdMm: 584, boreIdMm: 336.6, raisedFaceDiaMm: 412.8, hubLengthMm: 162 },
  { dn: 400, flangeOdMm: 648, boreIdMm: 387.4, raisedFaceDiaMm: 469.9, hubLengthMm: 171 },
  { dn: 450, flangeOdMm: 711, boreIdMm: 438.2, raisedFaceDiaMm: 533.4, hubLengthMm: 184 },
  { dn: 500, flangeOdMm: 775, boreIdMm: 489.0, raisedFaceDiaMm: 584.2, hubLengthMm: 194 },
  { dn: 600, flangeOdMm: 914, boreIdMm: 590.6, raisedFaceDiaMm: 692.2, hubLengthMm: 216 },
];

// ASME B16.5 Class 600 Flange Dimensions
export const ANSI_B165_CLASS_600_FLANGES: FlangeDimensions[] = [
  { dn: 15, flangeOdMm: 95, boreIdMm: 15.8, raisedFaceDiaMm: 34.9, hubLengthMm: 38 },
  { dn: 20, flangeOdMm: 117, boreIdMm: 20.9, raisedFaceDiaMm: 42.9, hubLengthMm: 48 },
  { dn: 25, flangeOdMm: 124, boreIdMm: 26.6, raisedFaceDiaMm: 50.8, hubLengthMm: 52 },
  { dn: 32, flangeOdMm: 133, boreIdMm: 35.1, raisedFaceDiaMm: 63.5, hubLengthMm: 57 },
  { dn: 40, flangeOdMm: 156, boreIdMm: 40.9, raisedFaceDiaMm: 73.0, hubLengthMm: 62 },
  { dn: 50, flangeOdMm: 165, boreIdMm: 52.5, raisedFaceDiaMm: 92.1, hubLengthMm: 67 },
  { dn: 65, flangeOdMm: 190, boreIdMm: 62.7, raisedFaceDiaMm: 104.8, hubLengthMm: 73 },
  { dn: 80, flangeOdMm: 210, boreIdMm: 77.9, raisedFaceDiaMm: 127.0, hubLengthMm: 83 },
  { dn: 100, flangeOdMm: 273, boreIdMm: 102.3, raisedFaceDiaMm: 157.2, hubLengthMm: 102 },
  { dn: 125, flangeOdMm: 330, boreIdMm: 128.2, raisedFaceDiaMm: 185.7, hubLengthMm: 114 },
  { dn: 150, flangeOdMm: 356, boreIdMm: 154.1, raisedFaceDiaMm: 215.9, hubLengthMm: 117 },
  { dn: 200, flangeOdMm: 419, boreIdMm: 202.7, raisedFaceDiaMm: 269.9, hubLengthMm: 133 },
  { dn: 250, flangeOdMm: 508, boreIdMm: 254.5, raisedFaceDiaMm: 323.8, hubLengthMm: 152 },
  { dn: 300, flangeOdMm: 559, boreIdMm: 304.8, raisedFaceDiaMm: 381.0, hubLengthMm: 156 },
  { dn: 350, flangeOdMm: 603, boreIdMm: 336.6, raisedFaceDiaMm: 412.8, hubLengthMm: 165 },
  { dn: 400, flangeOdMm: 686, boreIdMm: 387.4, raisedFaceDiaMm: 469.9, hubLengthMm: 178 },
  { dn: 450, flangeOdMm: 743, boreIdMm: 438.2, raisedFaceDiaMm: 533.4, hubLengthMm: 190 },
  { dn: 500, flangeOdMm: 813, boreIdMm: 489.0, raisedFaceDiaMm: 584.2, hubLengthMm: 203 },
  { dn: 600, flangeOdMm: 940, boreIdMm: 590.6, raisedFaceDiaMm: 692.2, hubLengthMm: 229 },
];

// Map of all flange dimension tables by pressure class
const FLANGE_DIMENSIONS_BY_CLASS: Record<string, FlangeDimensions[]> = {
  '150': ANSI_B165_CLASS_150_FLANGES,
  'CLASS 150': ANSI_B165_CLASS_150_FLANGES,
  'PN16': ANSI_B165_CLASS_150_FLANGES,
  'PN20': ANSI_B165_CLASS_150_FLANGES,
  '300': ANSI_B165_CLASS_300_FLANGES,
  'CLASS 300': ANSI_B165_CLASS_300_FLANGES,
  'PN50': ANSI_B165_CLASS_300_FLANGES,
  '600': ANSI_B165_CLASS_600_FLANGES,
  'CLASS 600': ANSI_B165_CLASS_600_FLANGES,
  'PN100': ANSI_B165_CLASS_600_FLANGES,
  '900': ANSI_B165_CLASS_600_FLANGES,  // Use Class 600 as approximation for higher classes
  'CLASS 900': ANSI_B165_CLASS_600_FLANGES,
  '1500': ANSI_B165_CLASS_600_FLANGES,
  'CLASS 1500': ANSI_B165_CLASS_600_FLANGES,
  '2500': ANSI_B165_CLASS_600_FLANGES,
  'CLASS 2500': ANSI_B165_CLASS_600_FLANGES,
};

/**
 * Get flange dimensions by DN and optional pressure class
 * @param dn Nominal diameter in mm
 * @param pressureClass Optional pressure class designation (e.g., '150', 'Class 300', 'PN50')
 */
export function getFlangeDimensionsByDn(dn: number, pressureClass?: string): FlangeDimensions | undefined {
  // Normalize pressure class to find the right table
  const normalizedClass = (pressureClass || '150').toUpperCase().trim();
  const flangeTable = FLANGE_DIMENSIONS_BY_CLASS[normalizedClass] || ANSI_B165_CLASS_150_FLANGES;
  return flangeTable.find(f => f.dn === dn);
}

/**
 * Calculate circular area in m² from diameter in mm
 */
function circularAreaM2(diameterMm: number): number {
  const radiusM = diameterMm / 2000; // Convert mm to m
  return Math.PI * radiusM * radiusM;
}

/**
 * Calculate annular (ring) area in m² from outer and inner diameters in mm
 */
function annularAreaM2(outerDiameterMm: number, innerDiameterMm: number): number {
  return circularAreaM2(outerDiameterMm) - circularAreaM2(innerDiameterMm);
}

/**
 * Calculate comprehensive surface area for pipes with flanges
 *
 * @param params Surface area calculation parameters
 * @returns Surface areas in m² for external and internal coating
 */
export interface SurfaceAreaParams {
  outsideDiameterMm: number;
  insideDiameterMm: number;
  pipeLengthM: number;
  numberOfFlanges: number;
  dn?: number;  // Optional - for flange dimension lookup
  pressureClass?: string;  // Optional - pressure class for flange dimension lookup
}

export interface SurfaceAreaResult {
  // External coating
  externalPipeAreaM2: number;      // Pipe external surface
  externalFlangeBackAreaM2: number; // Back of flanges (annular area)
  totalExternalAreaM2: number;     // Total for external coating

  // Internal coating
  internalPipeAreaM2: number;      // Pipe internal surface
  internalFlangeFaceAreaM2: number; // Flange face (raised face area)
  totalInternalAreaM2: number;     // Total for internal coating

  // Combined
  totalSurfaceAreaM2: number;      // Total surface area

  // Details
  flangeDataAvailable: boolean;
  flangeOdMm?: number;
  raisedFaceDiaMm?: number;
}

/**
 * Calculate comprehensive surface area for pipes with optional flanges
 * Includes:
 * - External: Pipe outer surface + flange back area (for external coating/painting)
 * - Internal: Pipe inner surface + flange face area (for internal lining)
 */
export function calculateComprehensiveSurfaceArea(params: SurfaceAreaParams): SurfaceAreaResult {
  const {
    outsideDiameterMm,
    insideDiameterMm,
    pipeLengthM,
    numberOfFlanges,
    dn,
    pressureClass,
  } = params;

  // External pipe surface area: π × OD × Length
  const outsideDiameterM = outsideDiameterMm / 1000;
  const externalPipeAreaM2 = Math.PI * outsideDiameterM * pipeLengthM;

  // Internal pipe surface area: π × ID × Length
  const insideDiameterM = insideDiameterMm / 1000;
  const internalPipeAreaM2 = Math.PI * insideDiameterM * pipeLengthM;

  // Initialize flange areas
  let externalFlangeBackAreaM2 = 0;
  let internalFlangeFaceAreaM2 = 0;
  let flangeDataAvailable = false;
  let flangeOdMm: number | undefined;
  let raisedFaceDiaMm: number | undefined;

  // Get flange dimensions if DN is provided (using pressure class if available)
  if (numberOfFlanges > 0 && dn) {
    const flangeDims = getFlangeDimensionsByDn(dn, pressureClass);

    if (flangeDims) {
      flangeDataAvailable = true;
      flangeOdMm = flangeDims.flangeOdMm;
      raisedFaceDiaMm = flangeDims.raisedFaceDiaMm;

      // External flange area (back of flange)
      // This is the annular area from flange OD to pipe OD
      // This is the area that gets painted on the back/outside of the flange
      externalFlangeBackAreaM2 = annularAreaM2(flangeDims.flangeOdMm, outsideDiameterMm) * numberOfFlanges;

      // Internal flange face area (the gasket seating surface)
      // This is the annular area from raised face diameter to bore ID
      // This is coated when internal lining is applied
      internalFlangeFaceAreaM2 = annularAreaM2(flangeDims.raisedFaceDiaMm, flangeDims.boreIdMm) * numberOfFlanges;
    } else {
      // Estimate flange areas if DN not found
      // Use typical flange OD ≈ 1.8 × Pipe OD for Class 150
      const estimatedFlangeOdMm = outsideDiameterMm * 1.8;
      const estimatedRaisedFaceDiaMm = outsideDiameterMm * 1.2;

      externalFlangeBackAreaM2 = annularAreaM2(estimatedFlangeOdMm, outsideDiameterMm) * numberOfFlanges;
      internalFlangeFaceAreaM2 = annularAreaM2(estimatedRaisedFaceDiaMm, insideDiameterMm) * numberOfFlanges;
      flangeOdMm = estimatedFlangeOdMm;
      raisedFaceDiaMm = estimatedRaisedFaceDiaMm;
    }
  }

  // Calculate totals
  const totalExternalAreaM2 = externalPipeAreaM2 + externalFlangeBackAreaM2;
  const totalInternalAreaM2 = internalPipeAreaM2 + internalFlangeFaceAreaM2;
  const totalSurfaceAreaM2 = totalExternalAreaM2 + totalInternalAreaM2;

  return {
    externalPipeAreaM2,
    externalFlangeBackAreaM2,
    totalExternalAreaM2,
    internalPipeAreaM2,
    internalFlangeFaceAreaM2,
    totalInternalAreaM2,
    totalSurfaceAreaM2,
    flangeDataAvailable,
    flangeOdMm,
    raisedFaceDiaMm,
  };
}

/**
 * Calculate surface area per pipe (for display purposes)
 * Returns values for a single pipe length
 */
export function calculateSurfaceAreaPerPipe(params: {
  outsideDiameterMm: number;
  insideDiameterMm: number;
  individualPipeLengthM: number;
  hasFlangeEnd1: boolean;
  hasFlangeEnd2: boolean;
  dn?: number;
  pressureClass?: string;
}): SurfaceAreaResult {
  const numberOfFlanges = (params.hasFlangeEnd1 ? 1 : 0) + (params.hasFlangeEnd2 ? 1 : 0);

  return calculateComprehensiveSurfaceArea({
    outsideDiameterMm: params.outsideDiameterMm,
    insideDiameterMm: params.insideDiameterMm,
    pipeLengthM: params.individualPipeLengthM,
    numberOfFlanges,
    dn: params.dn,
    pressureClass: params.pressureClass,
  });
}

/**
 * Calculate total surface area for all pipes in an entry
 */
export function calculateTotalSurfaceArea(params: {
  outsideDiameterMm: number;
  insideDiameterMm: number;
  individualPipeLengthM: number;
  numberOfPipes: number;
  hasFlangeEnd1: boolean;
  hasFlangeEnd2: boolean;
  dn?: number;
  pressureClass?: string;
}): {
  perPipe: SurfaceAreaResult;
  total: {
    totalExternalAreaM2: number;
    totalInternalAreaM2: number;
    totalSurfaceAreaM2: number;
  };
} {
  const perPipe = calculateSurfaceAreaPerPipe({
    outsideDiameterMm: params.outsideDiameterMm,
    insideDiameterMm: params.insideDiameterMm,
    individualPipeLengthM: params.individualPipeLengthM,
    hasFlangeEnd1: params.hasFlangeEnd1,
    hasFlangeEnd2: params.hasFlangeEnd2,
    dn: params.dn,
    pressureClass: params.pressureClass,
  });

  return {
    perPipe,
    total: {
      totalExternalAreaM2: perPipe.totalExternalAreaM2 * params.numberOfPipes,
      totalInternalAreaM2: perPipe.totalInternalAreaM2 * params.numberOfPipes,
      totalSurfaceAreaM2: perPipe.totalSurfaceAreaM2 * params.numberOfPipes,
    },
  };
}
