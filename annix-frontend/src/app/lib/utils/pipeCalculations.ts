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
