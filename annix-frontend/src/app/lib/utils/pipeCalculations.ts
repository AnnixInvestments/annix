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
