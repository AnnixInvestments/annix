/**
 * SABS 719 Tee Dimensions Data
 *
 * Data extracted from Tender Template.xlsx - SABS 719 tab
 *
 * Short Tees: Simple T-junction without gusset reinforcement
 * Gusset Tees: T-junction with 45° gusset plates at branch connection
 *
 * Dimensions:
 * - A (shortTeeHeight): Center-to-face dimension for Short Tees (centerline of run to branch face)
 * - B (gussetTeeHeight): Center-to-face dimension for Gusset Tees (larger due to gusset reinforcement)
 * - C (gussetSection): Gusset plate dimension (triangular reinforcement size)
 *
 * Notes from specification:
 * - A & B dims to be multiplied by 3 to get overall length of steel
 * - Gusset Section to be multiplied by 2 and added to B dims for overall weight for pricing
 */

export interface Sabs719TeeDimensions {
  nominalBoreMm: number;
  outsideDiameterMm: number;
  shortTeeHeightMm: number;    // A dimension
  gussetTeeHeightMm: number;   // B dimension
  gussetSectionMm: number;     // C dimension
}

export const SABS_719_TEE_DATA: Sabs719TeeDimensions[] = [
  { nominalBoreMm: 200,  outsideDiameterMm: 219.1, shortTeeHeightMm: 230,  gussetTeeHeightMm: 355,  gussetSectionMm: 102 },
  { nominalBoreMm: 250,  outsideDiameterMm: 273.1, shortTeeHeightMm: 280,  gussetTeeHeightMm: 405,  gussetSectionMm: 127 },
  { nominalBoreMm: 300,  outsideDiameterMm: 323.9, shortTeeHeightMm: 305,  gussetTeeHeightMm: 460,  gussetSectionMm: 155 },
  { nominalBoreMm: 350,  outsideDiameterMm: 355.6, shortTeeHeightMm: 355,  gussetTeeHeightMm: 510,  gussetSectionMm: 180 },
  { nominalBoreMm: 400,  outsideDiameterMm: 406.4, shortTeeHeightMm: 405,  gussetTeeHeightMm: 560,  gussetSectionMm: 205 },
  { nominalBoreMm: 450,  outsideDiameterMm: 457.0, shortTeeHeightMm: 460,  gussetTeeHeightMm: 610,  gussetSectionMm: 230 },
  { nominalBoreMm: 500,  outsideDiameterMm: 508.0, shortTeeHeightMm: 510,  gussetTeeHeightMm: 660,  gussetSectionMm: 255 },
  { nominalBoreMm: 550,  outsideDiameterMm: 559.0, shortTeeHeightMm: 560,  gussetTeeHeightMm: 710,  gussetSectionMm: 280 },
  { nominalBoreMm: 600,  outsideDiameterMm: 610.0, shortTeeHeightMm: 610,  gussetTeeHeightMm: 760,  gussetSectionMm: 305 },
  { nominalBoreMm: 650,  outsideDiameterMm: 660.0, shortTeeHeightMm: 660,  gussetTeeHeightMm: 815,  gussetSectionMm: 330 },
  { nominalBoreMm: 700,  outsideDiameterMm: 711.0, shortTeeHeightMm: 710,  gussetTeeHeightMm: 865,  gussetSectionMm: 355 },
  { nominalBoreMm: 750,  outsideDiameterMm: 762.0, shortTeeHeightMm: 760,  gussetTeeHeightMm: 915,  gussetSectionMm: 380 },
  { nominalBoreMm: 800,  outsideDiameterMm: 813.0, shortTeeHeightMm: 815,  gussetTeeHeightMm: 970,  gussetSectionMm: 405 },
  { nominalBoreMm: 850,  outsideDiameterMm: 864.0, shortTeeHeightMm: 865,  gussetTeeHeightMm: 1020, gussetSectionMm: 430 },
  { nominalBoreMm: 900,  outsideDiameterMm: 914.0, shortTeeHeightMm: 915,  gussetTeeHeightMm: 1070, gussetSectionMm: 460 },
];

// Available nominal bore options for SABS 719 Tees
export const SABS_719_TEE_NB_OPTIONS = SABS_719_TEE_DATA.map(d => d.nominalBoreMm);

/**
 * Get SABS 719 Tee dimensions for a given nominal bore
 */
export function getSabs719TeeDimensions(nominalBoreMm: number): Sabs719TeeDimensions | undefined {
  return SABS_719_TEE_DATA.find(d => d.nominalBoreMm === nominalBoreMm);
}

/**
 * Get the outside diameter for a given nominal bore
 */
export function getSabs719OutsideDiameter(nominalBoreMm: number): number {
  const dims = getSabs719TeeDimensions(nominalBoreMm);
  return dims?.outsideDiameterMm || nominalBoreMm * 1.1;
}

/**
 * Calculate the steel length required for a Short Tee
 * A dims to be multiplied by 3 to get overall length
 */
export function calculateShortTeeSteelLength(nominalBoreMm: number): number {
  const dims = getSabs719TeeDimensions(nominalBoreMm);
  if (!dims) return 0;
  return dims.shortTeeHeightMm * 3;
}

/**
 * Calculate the steel length required for a Gusset Tee
 * B dims to be multiplied by 3, then gusset section * 2 is added
 */
export function calculateGussetTeeSteelLength(nominalBoreMm: number): number {
  const dims = getSabs719TeeDimensions(nominalBoreMm);
  if (!dims) return 0;
  return (dims.gussetTeeHeightMm * 3) + (dims.gussetSectionMm * 2);
}

/**
 * Tee types available in SABS 719
 */
export type Sabs719TeeType = 'short' | 'gusset';

/**
 * Get the center-to-face height based on tee type
 */
export function getTeeHeight(nominalBoreMm: number, teeType: Sabs719TeeType): number {
  const dims = getSabs719TeeDimensions(nominalBoreMm);
  if (!dims) return nominalBoreMm; // Fallback
  return teeType === 'gusset' ? dims.gussetTeeHeightMm : dims.shortTeeHeightMm;
}

/**
 * Get the gusset section dimension (only applicable for gusset tees)
 */
export function getGussetSection(nominalBoreMm: number): number {
  const dims = getSabs719TeeDimensions(nominalBoreMm);
  return dims?.gussetSectionMm || 0;
}

/**
 * Calculate estimated weight for a SABS 719 Tee
 * Uses steel density of 7.84 g/cm³ (7840 kg/m³)
 */
export function calculateTeeWeight(
  nominalBoreMm: number,
  wallThicknessMm: number,
  teeType: Sabs719TeeType
): number {
  const dims = getSabs719TeeDimensions(nominalBoreMm);
  if (!dims) return 0;

  const od = dims.outsideDiameterMm;
  const id = od - (2 * wallThicknessMm);
  const steelDensity = 7840; // kg/m³

  // Cross-sectional area of pipe wall
  const pipeArea = (Math.PI / 4) * ((od * od) - (id * id)); // mm²

  // Total steel length based on tee type
  const steelLengthMm = teeType === 'gusset'
    ? calculateGussetTeeSteelLength(nominalBoreMm)
    : calculateShortTeeSteelLength(nominalBoreMm);

  // Volume in m³
  const volumeM3 = (pipeArea * steelLengthMm) / 1e9;

  // Weight from pipe
  let weight = volumeM3 * steelDensity;

  // Add gusset plate weight for gusset tees
  if (teeType === 'gusset') {
    const gussetSection = dims.gussetSectionMm;
    // Estimate gusset plate thickness as 10mm for smaller sizes, 14mm for larger
    const gussetThickness = nominalBoreMm <= 400 ? 10 : 14;
    // Two triangular gusset plates, each approximately (gussetSection² / 2) area
    const gussetAreaMm2 = 2 * (gussetSection * gussetSection / 2);
    const gussetVolumeMm3 = gussetAreaMm2 * gussetThickness;
    const gussetWeightKg = (gussetVolumeMm3 / 1e9) * steelDensity;
    weight += gussetWeightKg;
  }

  return Math.round(weight * 10) / 10; // Round to 1 decimal
}
