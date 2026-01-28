export const STEEL_DENSITY_KG_M3 = 7850;
export const STEEL_DENSITY_KG_MM3 = STEEL_DENSITY_KG_M3 / 1e9;
export const STEEL_DENSITY_KG_CM3 = STEEL_DENSITY_KG_M3 / 1e6;

export const steelDensity = {
  kgPerM3: STEEL_DENSITY_KG_M3,
  kgPerMm3: STEEL_DENSITY_KG_MM3,
  kgPerCm3: STEEL_DENSITY_KG_CM3,
  toKg: (volumeMm3: number) => volumeMm3 * STEEL_DENSITY_KG_MM3,
  toKgFromCm3: (volumeCm3: number) => volumeCm3 * STEEL_DENSITY_KG_CM3,
  toKgFromM3: (volumeM3: number) => volumeM3 * STEEL_DENSITY_KG_M3,
} as const;

export const WORKING_PRESSURE_BAR = [6, 10, 16, 25, 40, 63, 100, 160, 250, 320, 400, 630] as const;

export const WORKING_TEMPERATURE_CELSIUS = [
  -196, -101, -46, -29, -20, 0, 20, 50, 80, 120, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600
] as const;

export const TEMPERATURE_CATEGORIES = {
  cryogenic: [-196, -101],
  lowTemp: [-46, -29, -20],
  ambient: [0, 20],
  elevated: [50, 80, 120, 150],
  highTemp: [200, 250, 300, 350, 400, 450, 500],
  veryHighTemp: [550, 600],
} as const;

export const STANDARD_PIPE_LENGTHS_M = [
  { value: 6, label: '6m', description: 'Metric standard', isMetric: true },
  { value: 6.1, label: '6.1m', description: '20ft imperial', isMetric: false },
  { value: 9, label: '9m', description: 'Metric standard', isMetric: true },
  { value: 9.144, label: '9.144m', description: '30ft imperial', isMetric: false },
  { value: 12, label: '12m', description: 'Metric standard', isMetric: true },
  { value: 12.192, label: '12.192m', description: '40ft imperial', isMetric: false },
] as const;

export const PUDDLE_PIPE_LENGTHS_M = [
  { value: 1, label: '1m', description: 'Short puddle pipe' },
  { value: 1.5, label: '1.5m', description: 'Standard puddle pipe' },
  { value: 2, label: '2m', description: 'Standard puddle pipe' },
  { value: 2.5, label: '2.5m', description: 'Medium puddle pipe' },
  { value: 3, label: '3m', description: 'Long puddle pipe' },
] as const;

export const METRIC_PIPE_LENGTHS_M = [6, 9, 12] as const;
export const IMPERIAL_PIPE_LENGTHS_M = [6.1, 9.144, 12.192] as const;

export const DEFAULT_PIPE_LENGTH_M = 12;

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

export const DEFAULT_NOMINAL_BORES = [
  15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300,
  350, 400, 450, 500, 600, 700, 750, 800, 900, 1000, 1050, 1200
] as const;

export const SABS_1123_PRESSURE_KPA = [600, 1000, 1600, 2500, 4000] as const;

export const BS_4504_PRESSURE_PN = [6, 10, 16, 25, 40, 64, 100, 160] as const;

export const ANSI_PRESSURE_CLASSES = [150, 300, 600, 900, 1500, 2500] as const;

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
