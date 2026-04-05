import { STEEL_DENSITY_KG_M3, STEEL_DENSITY_KG_MM3 } from "../steel/constants";

export interface TackWeldConfig {
  tacksPerEnd: number;
  tackLengthMm: number;
  minLegSizeMm: number;
  maxLegSizeMm: number;
  legSizeFactor: number;
}

export const TACK_WELD_CONFIG: TackWeldConfig = {
  tacksPerEnd: 4,
  tackLengthMm: 20,
  minLegSizeMm: 3,
  maxLegSizeMm: 6,
  legSizeFactor: 0.02,
};

export const tackWeldConfig = (overrides?: Partial<TackWeldConfig>): TackWeldConfig => ({
  ...TACK_WELD_CONFIG,
  ...overrides,
});

export const CLOSURE_LENGTH_CONFIG = {
  minLengthFactor: 0.5,
  maxLengthFactor: 3,
  recommendedFactor: 1.5,
  absoluteMinMm: 50,
  absoluteMaxMm: 500,
  recommendedMinMm: 100,
  recommendedMaxMm: 300,
} as const;

export const RETAINING_RING_CONFIG = {
  odMultiplier: 1.15,
  minThicknessMm: 15,
  maxThicknessMm: 25,
  thicknessFactor: 0.04,
} as const;

export const WELD_INCREMENT_MM = 0.5;

export const PRESSURE_CALCULATION_CONSTANTS = {
  BAR_TO_MPA: 0.1,
  DEFAULT_SAFETY_FACTOR: 1.2,
  EXCELLENT_SAFETY_MARGIN: 2.0,
  GOOD_SAFETY_MARGIN: 1.5,
  ACCEPTABLE_SAFETY_MARGIN: 1.2,
} as const;

export const SURFACE_AREA_CONSTANTS = {
  FLANGE_ALLOWANCE_M: 0.1,
  RAISED_FACE_DIAMETER_FACTOR: 1.2,
} as const;

export const CALCULATION_DEFAULTS = {
  DEFAULT_JOINT_EFFICIENCY: 1.0,
  DEFAULT_CORROSION_ALLOWANCE_MM: 0,
  DEFAULT_TEMPERATURE_C: 20,
  OD_ESTIMATE_FACTOR: 1.05,
} as const;

export interface FilletWeldConfig {
  legSizeFactor: number;
  minLegSizeMm: number;
  maxLegSizeMm: number;
}

export const FILLET_WELD_CONFIG: FilletWeldConfig = {
  legSizeFactor: 0.7,
  minLegSizeMm: 3,
  maxLegSizeMm: 12,
};

export interface ButtWeldConfig {
  rootGapMm: number;
  grooveAngleDeg: number;
  reinforcementMm: number;
}

export const BUTT_WELD_CONFIG: ButtWeldConfig = {
  rootGapMm: 3,
  grooveAngleDeg: 60,
  reinforcementMm: 2,
};

export const tackWeldWeight = (
  nominalBoreMm: number,
  tackWeldEnds: number = 0,
  configOverrides?: Partial<TackWeldConfig>,
): number => {
  if (tackWeldEnds <= 0) return 0;

  const config = tackWeldConfig(configOverrides);
  const legSizeMm = Math.max(
    config.minLegSizeMm,
    Math.min(config.maxLegSizeMm, nominalBoreMm * config.legSizeFactor),
  );

  const totalTacks = config.tacksPerEnd * tackWeldEnds;
  const totalTackLengthMm = totalTacks * config.tackLengthMm;

  const volumePerMmMm3 = (legSizeMm * legSizeMm) / 2;
  const totalVolumeMm3 = volumePerMmMm3 * totalTackLengthMm;

  const weightKg = totalVolumeMm3 * STEEL_DENSITY_KG_MM3;

  return Math.round(weightKg * 1000) / 1000;
};

export const closureLengthLimits = (
  nominalBoreMm: number,
): { min: number; max: number; recommended: number } => {
  const {
    absoluteMinMm,
    absoluteMaxMm,
    minLengthFactor,
    maxLengthFactor,
    recommendedFactor,
    recommendedMinMm,
    recommendedMaxMm,
  } = CLOSURE_LENGTH_CONFIG;
  const minLength = Math.max(absoluteMinMm, nominalBoreMm * minLengthFactor);
  const maxLength = Math.min(absoluteMaxMm, nominalBoreMm * maxLengthFactor);
  const recommended = Math.max(
    recommendedMinMm,
    Math.min(recommendedMaxMm, nominalBoreMm * recommendedFactor),
  );

  return {
    min: Math.round(minLength),
    max: Math.round(maxLength),
    recommended: Math.round(recommended),
  };
};

export const closureWeight = (
  nominalBoreMm: number,
  closureLengthMm: number,
  wallThicknessMm: number,
  nbToOdMap: Record<number, number>,
): number => {
  if (!closureLengthMm || closureLengthMm <= 0) return 0;
  if (nominalBoreMm <= 0 || wallThicknessMm <= 0) return 0;

  const pipeOd = nbToOdMap[nominalBoreMm] || nominalBoreMm * 1.1;
  const pipeId = pipeOd - 2 * wallThicknessMm;

  const closureLengthM = closureLengthMm / 1000;
  const odM = pipeOd / 1000;
  const idM = pipeId / 1000;

  const volumeM3 = Math.PI * ((odM ** 2 - idM ** 2) / 4) * closureLengthM;
  const weightKg = volumeM3 * STEEL_DENSITY_KG_M3;

  return Math.round(weightKg * 100) / 100;
};
