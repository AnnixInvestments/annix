/**
 * Pipe Surface Area Calculations
 *
 * Extracted from pipeCalculations.ts (issue #191, Phase 7 megacomponent split).
 * Handles external/internal pipe + flange surface area computation for surface
 * protection (painting / rubber lining) scope estimation. Ships its own ANSI
 * B16.5 flange dimension lookup tables because `calculateComprehensiveSurfaceArea`
 * is the primary consumer.
 */

/**
 * Standard ANSI B16.5 Flange Dimensions (Class 150)
 * Common for most industrial applications
 * All dimensions in mm
 */
export interface FlangeDimensions {
  dn: number; // Nominal diameter (mm)
  flangeOdMm: number; // Flange outside diameter
  boreIdMm: number; // Bore ID (matches pipe ID approximately)
  raisedFaceDiaMm: number; // Raised face diameter (for RF flanges)
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
  "150": ANSI_B165_CLASS_150_FLANGES,
  "CLASS 150": ANSI_B165_CLASS_150_FLANGES,
  PN16: ANSI_B165_CLASS_150_FLANGES,
  PN20: ANSI_B165_CLASS_150_FLANGES,
  "300": ANSI_B165_CLASS_300_FLANGES,
  "CLASS 300": ANSI_B165_CLASS_300_FLANGES,
  PN50: ANSI_B165_CLASS_300_FLANGES,
  "600": ANSI_B165_CLASS_600_FLANGES,
  "CLASS 600": ANSI_B165_CLASS_600_FLANGES,
  PN100: ANSI_B165_CLASS_600_FLANGES,
  "900": ANSI_B165_CLASS_600_FLANGES, // Use Class 600 as approximation for higher classes
  "CLASS 900": ANSI_B165_CLASS_600_FLANGES,
  "1500": ANSI_B165_CLASS_600_FLANGES,
  "CLASS 1500": ANSI_B165_CLASS_600_FLANGES,
  "2500": ANSI_B165_CLASS_600_FLANGES,
  "CLASS 2500": ANSI_B165_CLASS_600_FLANGES,
};

/**
 * Get flange dimensions by DN and optional pressure class
 * @param dn Nominal diameter in mm
 * @param pressureClass Optional pressure class designation (e.g., '150', 'Class 300', 'PN50')
 */
export function getFlangeDimensionsByDn(
  dn: number,
  pressureClass?: string,
): FlangeDimensions | undefined {
  // Normalize pressure class to find the right table
  const normalizedClass = (pressureClass || "150").toUpperCase().trim();
  const rawNormalizedClass = FLANGE_DIMENSIONS_BY_CLASS[normalizedClass];
  const flangeTable = rawNormalizedClass || ANSI_B165_CLASS_150_FLANGES;
  return flangeTable.find((f) => f.dn === dn);
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
  dn?: number; // Optional - for flange dimension lookup
  pressureClass?: string; // Optional - pressure class for flange dimension lookup
}

export interface SurfaceAreaResult {
  // External coating
  externalPipeAreaM2: number; // Pipe external surface
  externalFlangeBackAreaM2: number; // Back of flanges (annular area)
  totalExternalAreaM2: number; // Total for external coating

  // Internal coating
  internalPipeAreaM2: number; // Pipe internal surface
  internalFlangeFaceAreaM2: number; // Flange face (raised face area)
  totalInternalAreaM2: number; // Total for internal coating

  // Combined
  totalSurfaceAreaM2: number; // Total surface area

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
 * Note: Adds 100mm allowance per flange/end to account for surface protection overlap
 */
export function calculateComprehensiveSurfaceArea(params: SurfaceAreaParams): SurfaceAreaResult {
  const { outsideDiameterMm, insideDiameterMm, pipeLengthM, numberOfFlanges, dn, pressureClass } =
    params;

  // Add 100mm (0.1m) allowance per flange/end for surface protection overlap
  const FLANGE_ALLOWANCE_M = 0.1; // 100mm per end
  const effectivePipeLengthM = pipeLengthM + numberOfFlanges * FLANGE_ALLOWANCE_M;

  // External pipe surface area: π × OD × Length (with flange allowance)
  const outsideDiameterM = outsideDiameterMm / 1000;
  const externalPipeAreaM2 = Math.PI * outsideDiameterM * effectivePipeLengthM;

  // Internal pipe surface area: π × ID × Length (with flange allowance)
  const insideDiameterM = insideDiameterMm / 1000;
  const internalPipeAreaM2 = Math.PI * insideDiameterM * effectivePipeLengthM;

  // Initialize flange areas
  let externalFlangeBackAreaM2 = 0;
  let internalFlangeFaceAreaM2 = 0;
  let flangeDataAvailable = false;
  let flangeOdMm: number | undefined;
  let raisedFaceDiaMm: number | undefined;

  // Detect if this is a flat face flange (SABS 1123 / BS 4504) vs raised face (ANSI)
  // SABS 1123 format: "1000/3" (pressure/table) - flat face flanges
  // BS 4504 format: "PN16" - flat face flanges
  // ANSI format: "Class 150", "150" - raised face flanges
  const isFlatFaceFlange = pressureClass
    ? /^\d+\/\d+$/.test(pressureClass) || /^PN\d+$/i.test(pressureClass)
    : false;

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
      externalFlangeBackAreaM2 =
        annularAreaM2(flangeDims.flangeOdMm, outsideDiameterMm) * numberOfFlanges;

      // Internal flange face area
      // For flat face flanges (SABS 1123 / BS 4504): use flange OD to pipe ID
      // For raised face flanges (ANSI): use raised face diameter to pipe ID
      const internalFaceDiameter = isFlatFaceFlange
        ? flangeDims.flangeOdMm
        : flangeDims.raisedFaceDiaMm;
      internalFlangeFaceAreaM2 =
        annularAreaM2(internalFaceDiameter, insideDiameterMm) * numberOfFlanges;
    } else {
      // Estimate flange areas if DN not found
      // Use typical flange OD ≈ 1.8 × Pipe OD for Class 150
      const estimatedFlangeOdMm = outsideDiameterMm * 1.8;
      const estimatedRaisedFaceDiaMm = outsideDiameterMm * 1.2;

      externalFlangeBackAreaM2 =
        annularAreaM2(estimatedFlangeOdMm, outsideDiameterMm) * numberOfFlanges;
      // Internal flange face area (estimated)
      const estimatedInternalFaceDiameter = isFlatFaceFlange
        ? estimatedFlangeOdMm
        : estimatedRaisedFaceDiaMm;
      internalFlangeFaceAreaM2 =
        annularAreaM2(estimatedInternalFaceDiameter, insideDiameterMm) * numberOfFlanges;
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
