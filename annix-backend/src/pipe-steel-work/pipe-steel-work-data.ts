import { PipeMaterialDto, SupportStandardDto } from "./dto/pipe-steel-work.dto";

export const SUPPORT_SPACING_TABLE: Record<number, { water: number; vapor: number; rod: number }> =
  {
    15: { water: 2.1, vapor: 2.7, rod: 10 },
    20: { water: 2.4, vapor: 3.0, rod: 10 },
    25: { water: 2.7, vapor: 3.4, rod: 10 },
    32: { water: 3.0, vapor: 3.7, rod: 10 },
    40: { water: 3.0, vapor: 3.7, rod: 10 },
    50: { water: 3.4, vapor: 4.3, rod: 10 },
    65: { water: 3.7, vapor: 4.6, rod: 10 },
    80: { water: 3.7, vapor: 4.6, rod: 10 },
    100: { water: 4.3, vapor: 5.2, rod: 12 },
    125: { water: 4.6, vapor: 5.5, rod: 12 },
    150: { water: 4.9, vapor: 5.8, rod: 16 },
    200: { water: 5.2, vapor: 6.4, rod: 16 },
    250: { water: 5.8, vapor: 7.0, rod: 20 },
    300: { water: 6.4, vapor: 7.6, rod: 20 },
    350: { water: 6.7, vapor: 7.9, rod: 24 },
    400: { water: 7.0, vapor: 8.2, rod: 24 },
    450: { water: 7.3, vapor: 8.5, rod: 24 },
    500: { water: 7.6, vapor: 8.8, rod: 30 },
    600: { water: 7.9, vapor: 9.1, rod: 30 },
    750: { water: 8.5, vapor: 9.8, rod: 36 },
    900: { water: 9.1, vapor: 10.4, rod: 36 },
  };

export const NB_TO_OD_MAP: Record<number, number> = {
  15: 21.3,
  20: 26.7,
  25: 33.4,
  32: 42.2,
  40: 48.3,
  50: 60.3,
  65: 73.0,
  80: 88.9,
  100: 114.3,
  125: 141.3,
  150: 168.3,
  200: 219.1,
  250: 273.1,
  300: 323.9,
  350: 355.6,
  400: 406.4,
  450: 457.0,
  500: 508.0,
  600: 610.0,
  750: 762.0,
  900: 914.0,
};

export const THERMAL_EXPANSION_COEFFICIENTS: Record<PipeMaterialDto, number> = {
  [PipeMaterialDto.CARBON_STEEL]: 0.012,
  [PipeMaterialDto.STAINLESS_304]: 0.017,
  [PipeMaterialDto.STAINLESS_316]: 0.016,
  [PipeMaterialDto.COPPER]: 0.017,
  [PipeMaterialDto.ALUMINUM]: 0.023,
  [PipeMaterialDto.CHROME_MOLY]: 0.0125,
  [PipeMaterialDto.CAST_IRON]: 0.01,
  [PipeMaterialDto.PVC]: 0.07,
  [PipeMaterialDto.HDPE]: 0.2,
};

export const TEMPERATURE_DERATING_FACTORS: Record<number, number> = {
  20: 1.0,
  100: 1.0,
  150: 0.98,
  200: 0.95,
  250: 0.91,
  300: 0.86,
  350: 0.8,
  400: 0.73,
  450: 0.65,
  500: 0.55,
};

export const WELD_STRENGTH_FACTORS: Record<string, number> = {
  full_penetration: 1.0,
  fillet: 0.55,
};

export const SCHEDULE_WALL_THICKNESSES: Record<string, Record<number, number>> = {
  Std: {
    50: 3.91,
    80: 5.49,
    100: 6.02,
    150: 7.11,
    200: 8.18,
    250: 9.27,
    300: 9.53,
    350: 9.53,
    400: 9.53,
    500: 9.53,
    600: 9.53,
  },
  Sch40: {
    50: 3.91,
    80: 5.49,
    100: 6.02,
    150: 7.11,
    200: 8.18,
    250: 9.27,
    300: 10.31,
    350: 11.13,
    400: 12.7,
    500: 12.7,
    600: 14.27,
  },
};

export const STANDARD_SPACING_TABLES: Record<
  SupportStandardDto,
  Record<number, { water: number; vapor: number; rod?: number }>
> = {
  [SupportStandardDto.MSS_SP_58]: SUPPORT_SPACING_TABLE,
  [SupportStandardDto.DIN_2509]: {
    15: { water: 1.8, vapor: 2.3 },
    20: { water: 2.0, vapor: 2.5 },
    25: { water: 2.3, vapor: 2.8 },
    32: { water: 2.5, vapor: 3.0 },
    40: { water: 2.5, vapor: 3.0 },
    50: { water: 2.8, vapor: 3.5 },
    65: { water: 3.0, vapor: 3.8 },
    80: { water: 3.0, vapor: 3.8 },
    100: { water: 3.5, vapor: 4.3 },
    125: { water: 3.8, vapor: 4.5 },
    150: { water: 4.0, vapor: 4.8 },
    200: { water: 4.3, vapor: 5.3 },
    250: { water: 4.8, vapor: 5.8 },
    300: { water: 5.3, vapor: 6.3 },
    350: { water: 5.5, vapor: 6.5 },
    400: { water: 5.8, vapor: 6.8 },
    450: { water: 6.0, vapor: 7.0 },
    500: { water: 6.3, vapor: 7.3 },
    600: { water: 6.5, vapor: 7.5 },
  },
  [SupportStandardDto.EN_13480]: {
    15: { water: 2.0, vapor: 2.5 },
    20: { water: 2.2, vapor: 2.8 },
    25: { water: 2.5, vapor: 3.2 },
    32: { water: 2.8, vapor: 3.5 },
    40: { water: 2.8, vapor: 3.5 },
    50: { water: 3.2, vapor: 4.0 },
    65: { water: 3.5, vapor: 4.3 },
    80: { water: 3.5, vapor: 4.3 },
    100: { water: 4.0, vapor: 4.8 },
    125: { water: 4.3, vapor: 5.2 },
    150: { water: 4.5, vapor: 5.5 },
    200: { water: 4.8, vapor: 6.0 },
    250: { water: 5.5, vapor: 6.5 },
    300: { water: 6.0, vapor: 7.0 },
    350: { water: 6.3, vapor: 7.3 },
    400: { water: 6.5, vapor: 7.5 },
    450: { water: 6.8, vapor: 7.8 },
    500: { water: 7.0, vapor: 8.0 },
    600: { water: 7.3, vapor: 8.5 },
  },
  [SupportStandardDto.ASME_B31_1]: {
    15: { water: 2.1, vapor: 2.7 },
    20: { water: 2.4, vapor: 3.0 },
    25: { water: 2.7, vapor: 3.4 },
    32: { water: 3.0, vapor: 3.7 },
    40: { water: 3.0, vapor: 3.7 },
    50: { water: 3.4, vapor: 4.3 },
    65: { water: 3.7, vapor: 4.6 },
    80: { water: 3.7, vapor: 4.6 },
    100: { water: 4.0, vapor: 4.9 },
    125: { water: 4.3, vapor: 5.2 },
    150: { water: 4.6, vapor: 5.5 },
    200: { water: 4.9, vapor: 6.1 },
    250: { water: 5.5, vapor: 6.7 },
    300: { water: 6.1, vapor: 7.3 },
    350: { water: 6.4, vapor: 7.6 },
    400: { water: 6.7, vapor: 7.9 },
    450: { water: 7.0, vapor: 8.2 },
    500: { water: 7.3, vapor: 8.5 },
    600: { water: 7.6, vapor: 8.8 },
  },
  [SupportStandardDto.ASME_B31_3]: {
    15: { water: 2.1, vapor: 2.7 },
    20: { water: 2.4, vapor: 3.0 },
    25: { water: 2.7, vapor: 3.4 },
    32: { water: 3.0, vapor: 3.7 },
    40: { water: 3.0, vapor: 3.7 },
    50: { water: 3.4, vapor: 4.3 },
    65: { water: 3.7, vapor: 4.6 },
    80: { water: 3.7, vapor: 4.6 },
    100: { water: 4.3, vapor: 5.2 },
    125: { water: 4.6, vapor: 5.5 },
    150: { water: 4.9, vapor: 5.8 },
    200: { water: 5.2, vapor: 6.4 },
    250: { water: 5.8, vapor: 7.0 },
    300: { water: 6.4, vapor: 7.6 },
    350: { water: 6.7, vapor: 7.9 },
    400: { water: 7.0, vapor: 8.2 },
    450: { water: 7.3, vapor: 8.5 },
    500: { water: 7.6, vapor: 8.8 },
    600: { water: 7.9, vapor: 9.1 },
  },
};

export const STANDARD_FULL_NAMES: Record<SupportStandardDto, string> = {
  [SupportStandardDto.MSS_SP_58]: "Manufacturers Standardization Society SP-58",
  [SupportStandardDto.DIN_2509]: "Deutsches Institut für Normung 2509",
  [SupportStandardDto.EN_13480]: "European Standard EN 13480 - Metallic Industrial Piping",
  [SupportStandardDto.ASME_B31_1]: "ASME B31.1 - Power Piping",
  [SupportStandardDto.ASME_B31_3]: "ASME B31.3 - Process Piping",
};

export function findClosestNb(diameterMm: number): number {
  const nbSizes = Object.keys(SUPPORT_SPACING_TABLE).map(Number);
  let closest = nbSizes[0];
  let minDiff = Math.abs(diameterMm - closest);

  for (const nb of nbSizes) {
    const diff = Math.abs(diameterMm - nb);
    if (diff < minDiff) {
      minDiff = diff;
      closest = nb;
    }
  }

  return closest;
}

export function interpolateSpacing(diameterMm: number): {
  water: number;
  vapor: number;
  rod: number;
} {
  const nbSizes = Object.keys(SUPPORT_SPACING_TABLE)
    .map(Number)
    .sort((a, b) => a - b);

  if (diameterMm <= nbSizes[0]) {
    return SUPPORT_SPACING_TABLE[nbSizes[0]];
  }
  if (diameterMm >= nbSizes[nbSizes.length - 1]) {
    return SUPPORT_SPACING_TABLE[nbSizes[nbSizes.length - 1]];
  }

  let lowerNb = nbSizes[0];
  let upperNb = nbSizes[nbSizes.length - 1];

  for (let i = 0; i < nbSizes.length - 1; i++) {
    if (diameterMm >= nbSizes[i] && diameterMm <= nbSizes[i + 1]) {
      lowerNb = nbSizes[i];
      upperNb = nbSizes[i + 1];
      break;
    }
  }

  const lowerSpacing = SUPPORT_SPACING_TABLE[lowerNb];
  const upperSpacing = SUPPORT_SPACING_TABLE[upperNb];

  const ratio = (diameterMm - lowerNb) / (upperNb - lowerNb);

  return {
    water:
      Math.round((lowerSpacing.water + ratio * (upperSpacing.water - lowerSpacing.water)) * 10) /
      10,
    vapor:
      Math.round((lowerSpacing.vapor + ratio * (upperSpacing.vapor - lowerSpacing.vapor)) * 10) /
      10,
    rod: lowerSpacing.rod,
  };
}

export function estimateWallThickness(nominalDiameterMm: number, schedule?: string): number {
  const closestNb = findClosestNb(nominalDiameterMm);
  const scheduleData =
    SCHEDULE_WALL_THICKNESSES[schedule || "Std"] || SCHEDULE_WALL_THICKNESSES["Std"];

  return scheduleData[closestNb] || 6.0;
}

export function estimatePipeWeightPerMeter(
  nbMm: number,
  schedule?: string,
  waterFilled = true,
  steelDensity = 7850,
): number {
  const od = NB_TO_OD_MAP[nbMm] || nbMm * 1.1;
  const wall = estimateWallThickness(nbMm, schedule);
  const id = od - 2 * wall;

  const steelArea = (Math.PI / 4) * (od ** 2 - id ** 2);
  const steelWeight = (steelArea / 1e6) * steelDensity;

  let waterWeight = 0;
  if (waterFilled) {
    const waterArea = (Math.PI / 4) * id ** 2;
    waterWeight = (waterArea / 1e6) * 1000;
  }

  return steelWeight + waterWeight;
}

export function interpolateSpacingFromTable(
  diameterMm: number,
  table: Record<number, { water: number; vapor: number; rod?: number }>,
): { water: number; vapor: number; rod?: number } {
  const sizes = Object.keys(table)
    .map(Number)
    .sort((a, b) => a - b);

  if (diameterMm <= sizes[0]) return table[sizes[0]];
  if (diameterMm >= sizes[sizes.length - 1]) return table[sizes[sizes.length - 1]];

  let lower = sizes[0];
  let upper = sizes[sizes.length - 1];

  for (let i = 0; i < sizes.length - 1; i++) {
    if (diameterMm >= sizes[i] && diameterMm <= sizes[i + 1]) {
      lower = sizes[i];
      upper = sizes[i + 1];
      break;
    }
  }

  const ratio = (diameterMm - lower) / (upper - lower);
  const lowerVal = table[lower];
  const upperVal = table[upper];

  return {
    water: Math.round((lowerVal.water + ratio * (upperVal.water - lowerVal.water)) * 10) / 10,
    vapor: Math.round((lowerVal.vapor + ratio * (upperVal.vapor - lowerVal.vapor)) * 10) / 10,
    rod: lowerVal.rod,
  };
}

export function interpolateTemperatureDerating(tempC: number): number {
  const temps = Object.keys(TEMPERATURE_DERATING_FACTORS)
    .map(Number)
    .sort((a, b) => a - b);

  if (tempC <= temps[0]) return TEMPERATURE_DERATING_FACTORS[temps[0]];
  if (tempC >= temps[temps.length - 1])
    return TEMPERATURE_DERATING_FACTORS[temps[temps.length - 1]];

  let lower = temps[0];
  let upper = temps[temps.length - 1];

  for (let i = 0; i < temps.length - 1; i++) {
    if (tempC >= temps[i] && tempC <= temps[i + 1]) {
      lower = temps[i];
      upper = temps[i + 1];
      break;
    }
  }

  const ratio = (tempC - lower) / (upper - lower);
  return (
    TEMPERATURE_DERATING_FACTORS[lower] +
    ratio * (TEMPERATURE_DERATING_FACTORS[upper] - TEMPERATURE_DERATING_FACTORS[lower])
  );
}
