/**
 * Reducer Size Combinations - Valid D1 (large NB) to D2 (small NB) mappings
 *
 * Based on SABS 719 reducer dimension table.
 * D2 range represents the valid small end nominal bore sizes for each large end.
 *
 * Note: Reducers can transition between SABS 719 (200+) and SABS 62 (up to 150) sizes.
 */

export interface ReducerSizeCombination {
  largeNbMm: number;
  validSmallNbMm: number[];
  standardLengthMm: number;
}

/**
 * SABS 719 Reducer combinations
 * Large NB from 200-900mm with valid small NB options
 */
export const SABS719_REDUCER_COMBINATIONS: ReducerSizeCombination[] = [
  { largeNbMm: 200, validSmallNbMm: [100, 125, 150], standardLengthMm: 180 },
  { largeNbMm: 250, validSmallNbMm: [150, 200], standardLengthMm: 205 },
  { largeNbMm: 300, validSmallNbMm: [150, 200, 250], standardLengthMm: 230 },
  { largeNbMm: 350, validSmallNbMm: [200, 250, 300], standardLengthMm: 255 },
  { largeNbMm: 400, validSmallNbMm: [250, 300, 350], standardLengthMm: 280 },
  { largeNbMm: 450, validSmallNbMm: [300, 350, 400], standardLengthMm: 305 },
  { largeNbMm: 500, validSmallNbMm: [300, 350, 400, 450], standardLengthMm: 330 },
  { largeNbMm: 550, validSmallNbMm: [350, 400, 450, 500], standardLengthMm: 355 },
  { largeNbMm: 600, validSmallNbMm: [400, 450, 500, 550], standardLengthMm: 380 },
  { largeNbMm: 650, validSmallNbMm: [400, 450, 500, 550, 600], standardLengthMm: 405 },
  { largeNbMm: 700, validSmallNbMm: [450, 500, 550, 600, 650], standardLengthMm: 430 },
  { largeNbMm: 750, validSmallNbMm: [500, 550, 600, 650, 700], standardLengthMm: 460 },
  { largeNbMm: 800, validSmallNbMm: [550, 600, 650, 700, 750], standardLengthMm: 485 },
  { largeNbMm: 850, validSmallNbMm: [550, 600, 650, 700, 750, 800], standardLengthMm: 510 },
  { largeNbMm: 900, validSmallNbMm: [600, 650, 700, 750, 800, 850], standardLengthMm: 535 },
];

/**
 * SABS 62 Reducer combinations
 * For smaller pipe sizes (up to 150mm NB)
 */
export const SABS62_REDUCER_COMBINATIONS: ReducerSizeCombination[] = [
  { largeNbMm: 25, validSmallNbMm: [15, 20], standardLengthMm: 50 },
  { largeNbMm: 32, validSmallNbMm: [15, 20, 25], standardLengthMm: 55 },
  { largeNbMm: 40, validSmallNbMm: [20, 25, 32], standardLengthMm: 60 },
  { largeNbMm: 50, validSmallNbMm: [25, 32, 40], standardLengthMm: 65 },
  { largeNbMm: 65, validSmallNbMm: [32, 40, 50], standardLengthMm: 75 },
  { largeNbMm: 80, validSmallNbMm: [40, 50, 65], standardLengthMm: 85 },
  { largeNbMm: 100, validSmallNbMm: [50, 65, 80], standardLengthMm: 100 },
  { largeNbMm: 125, validSmallNbMm: [65, 80, 100], standardLengthMm: 115 },
  { largeNbMm: 150, validSmallNbMm: [80, 100, 125], standardLengthMm: 130 },
];

/**
 * ASTM/ANSI Reducer combinations
 * Full range of sizes following ASME B16.9 butt-weld fitting dimensions
 */
export const ASTM_REDUCER_COMBINATIONS: ReducerSizeCombination[] = [
  { largeNbMm: 20, validSmallNbMm: [15], standardLengthMm: 51 },
  { largeNbMm: 25, validSmallNbMm: [15, 20], standardLengthMm: 51 },
  { largeNbMm: 32, validSmallNbMm: [15, 20, 25], standardLengthMm: 51 },
  { largeNbMm: 40, validSmallNbMm: [15, 20, 25, 32], standardLengthMm: 51 },
  { largeNbMm: 50, validSmallNbMm: [20, 25, 32, 40], standardLengthMm: 64 },
  { largeNbMm: 65, validSmallNbMm: [25, 32, 40, 50], standardLengthMm: 76 },
  { largeNbMm: 80, validSmallNbMm: [32, 40, 50, 65], standardLengthMm: 89 },
  { largeNbMm: 100, validSmallNbMm: [40, 50, 65, 80], standardLengthMm: 102 },
  { largeNbMm: 125, validSmallNbMm: [50, 65, 80, 100], standardLengthMm: 127 },
  { largeNbMm: 150, validSmallNbMm: [65, 80, 100, 125], standardLengthMm: 140 },
  { largeNbMm: 200, validSmallNbMm: [80, 100, 125, 150], standardLengthMm: 152 },
  { largeNbMm: 250, validSmallNbMm: [100, 125, 150, 200], standardLengthMm: 178 },
  { largeNbMm: 300, validSmallNbMm: [125, 150, 200, 250], standardLengthMm: 203 },
  { largeNbMm: 350, validSmallNbMm: [150, 200, 250, 300], standardLengthMm: 330 },
  { largeNbMm: 400, validSmallNbMm: [200, 250, 300, 350], standardLengthMm: 356 },
  { largeNbMm: 450, validSmallNbMm: [250, 300, 350, 400], standardLengthMm: 381 },
  { largeNbMm: 500, validSmallNbMm: [250, 300, 350, 400, 450], standardLengthMm: 508 },
  { largeNbMm: 600, validSmallNbMm: [300, 350, 400, 450, 500], standardLengthMm: 508 },
];

/**
 * Get valid small NB options for a given large NB and steel specification
 *
 * @param largeNbMm - The large nominal bore in mm
 * @param steelSpecId - The steel specification ID (8 = SABS 719)
 * @param steelSpecName - Optional steel specification name for better matching
 * @returns Array of valid small NB options, sorted descending (largest first)
 */
export const validSmallNbForLargeNb = (
  largeNbMm: number,
  steelSpecId?: number,
  steelSpecName?: string,
): number[] => {
  const isSABS719 = steelSpecId === 8 || steelSpecName?.includes("SABS 719");
  const isSABS62 = steelSpecName?.includes("SABS 62") || steelSpecName?.includes("SANS 62");

  const combinations = isSABS719
    ? SABS719_REDUCER_COMBINATIONS
    : isSABS62
      ? SABS62_REDUCER_COMBINATIONS
      : ASTM_REDUCER_COMBINATIONS;

  const match = combinations.find((c) => c.largeNbMm === largeNbMm);

  if (match) {
    return [...match.validSmallNbMm].sort((a, b) => b - a);
  }

  const allSizes = [
    15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600, 650,
    700, 750, 800, 850, 900,
  ];
  return allSizes.filter((nb) => nb < largeNbMm).slice(-4);
};

/**
 * Get standard reducer length for a given large NB
 *
 * @param largeNbMm - The large nominal bore in mm
 * @param steelSpecId - The steel specification ID
 * @param steelSpecName - Optional steel specification name
 * @returns Standard length in mm, or undefined if not found
 */
export const standardReducerLengthForNb = (
  largeNbMm: number,
  steelSpecId?: number,
  steelSpecName?: string,
): number | undefined => {
  const isSABS719 = steelSpecId === 8 || steelSpecName?.includes("SABS 719");
  const isSABS62 = steelSpecName?.includes("SABS 62") || steelSpecName?.includes("SANS 62");

  const combinations = isSABS719
    ? SABS719_REDUCER_COMBINATIONS
    : isSABS62
      ? SABS62_REDUCER_COMBINATIONS
      : ASTM_REDUCER_COMBINATIONS;

  const match = combinations.find((c) => c.largeNbMm === largeNbMm);
  return match?.standardLengthMm;
};

/**
 * Check if a reducer size combination is valid
 *
 * @param largeNbMm - The large nominal bore in mm
 * @param smallNbMm - The small nominal bore in mm
 * @param steelSpecId - The steel specification ID
 * @param steelSpecName - Optional steel specification name
 * @returns true if the combination is valid
 */
export const isValidReducerCombination = (
  largeNbMm: number,
  smallNbMm: number,
  steelSpecId?: number,
  steelSpecName?: string,
): boolean => {
  const validSizes = validSmallNbForLargeNb(largeNbMm, steelSpecId, steelSpecName);
  return validSizes.includes(smallNbMm);
};
