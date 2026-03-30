import {
  ASTM_REDUCER_COMBINATIONS,
  SABS62_REDUCER_COMBINATIONS,
  SABS719_REDUCER_COMBINATIONS,
} from "@annix/product-data/pipe";

export type { ReducerSizeCombination } from "@annix/product-data/pipe";
export { SABS719_REDUCER_COMBINATIONS, SABS62_REDUCER_COMBINATIONS, ASTM_REDUCER_COMBINATIONS };

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

export const isValidReducerCombination = (
  largeNbMm: number,
  smallNbMm: number,
  steelSpecId?: number,
  steelSpecName?: string,
): boolean => {
  const validSizes = validSmallNbForLargeNb(largeNbMm, steelSpecId, steelSpecName);
  return validSizes.includes(smallNbMm);
};
