export const STEEL_DENSITY_KG_M3 = 7850;
export const STEEL_DENSITY_KG_MM3 = 0.00000785;

export const WORKING_PRESSURE_BAR = [6, 10, 16, 25, 40, 63, 100, 160, 250, 320, 400, 630] as const;

export const WORKING_TEMPERATURE_CELSIUS = [-29, -20, 0, 20, 50, 80, 120, 150, 200, 250, 300, 350, 400, 450, 500] as const;

export const STANDARD_PIPE_LENGTHS_M = [
  { value: 6.1, label: '6.1m', description: '20ft / 6m standard' },
  { value: 9.144, label: '9.144m', description: '30ft standard' },
  { value: 12.192, label: '12.192m', description: '40ft standard' },
] as const;

export const DEFAULT_PIPE_LENGTH_M = 12.192;

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
