export interface TemperatureDeratingPoint {
  temperatureC: number;
  factor: number;
}

export const HDPE_TEMPERATURE_DERATING: TemperatureDeratingPoint[] = [
  { temperatureC: 20, factor: 1.0 },
  { temperatureC: 25, factor: 0.935 },
  { temperatureC: 30, factor: 0.87 },
  { temperatureC: 35, factor: 0.805 },
  { temperatureC: 40, factor: 0.74 },
  { temperatureC: 45, factor: 0.68 },
  { temperatureC: 50, factor: 0.62 },
  { temperatureC: 55, factor: 0.56 },
  { temperatureC: 60, factor: 0.5 },
];

export const HDPE_MIN_OPERATING_TEMP_C = -40;
export const HDPE_MAX_CONTINUOUS_TEMP_C = 60;
export const HDPE_MAX_SHORT_TERM_TEMP_C = 80;

export interface DeratingResult {
  factor: number;
  deratedPnBar: number;
  isExact: boolean;
  warning: string | null;
}

export const deratingFactorForTemperature = (temperatureC: number): number => {
  if (temperatureC <= 20) {
    return 1.0;
  }

  if (temperatureC >= 60) {
    return 0.5;
  }

  const sortedPoints = [...HDPE_TEMPERATURE_DERATING].sort(
    (a, b) => a.temperatureC - b.temperatureC,
  );

  const exactMatch = sortedPoints.find((p) => p.temperatureC === temperatureC);
  if (exactMatch) {
    return exactMatch.factor;
  }

  const upperIndex = sortedPoints.findIndex((p) => p.temperatureC > temperatureC);
  if (upperIndex <= 0) {
    return 1.0;
  }

  const lower = sortedPoints[upperIndex - 1];
  const upper = sortedPoints[upperIndex];

  const tempRange = upper.temperatureC - lower.temperatureC;
  const tempOffset = temperatureC - lower.temperatureC;
  const ratio = tempOffset / tempRange;

  const factorRange = upper.factor - lower.factor;
  const interpolatedFactor = lower.factor + factorRange * ratio;

  return Math.round(interpolatedFactor * 1000) / 1000;
};

export const deratedPressure = (basePnBar: number, temperatureC: number): DeratingResult => {
  const factor = deratingFactorForTemperature(temperatureC);
  const deratedPnBar = Math.round(basePnBar * factor * 10) / 10;

  let warning: string | null = null;

  if (temperatureC < HDPE_MIN_OPERATING_TEMP_C) {
    warning = `Temperature ${temperatureC}C is below minimum operating temperature ${HDPE_MIN_OPERATING_TEMP_C}C - risk of brittleness`;
  } else if (temperatureC > HDPE_MAX_CONTINUOUS_TEMP_C) {
    warning = `Temperature ${temperatureC}C exceeds maximum continuous operating temperature ${HDPE_MAX_CONTINUOUS_TEMP_C}C`;
  } else if (temperatureC > 50) {
    warning = `Temperature ${temperatureC}C significantly reduces pressure rating - verify application suitability`;
  }

  const isExact = HDPE_TEMPERATURE_DERATING.some((p) => p.temperatureC === temperatureC);

  return {
    factor,
    deratedPnBar,
    isExact,
    warning,
  };
};

export interface TemperatureValidation {
  valid: boolean;
  warnings: string[];
  errors: string[];
}

export const validateOperatingTemperature = (
  temperatureC: number,
  requiredPnBar: number,
  basePnBar: number,
): TemperatureValidation => {
  const warnings: string[] = [];
  const errors: string[] = [];

  if (temperatureC < HDPE_MIN_OPERATING_TEMP_C) {
    errors.push(
      `Operating temperature ${temperatureC}C is below minimum ${HDPE_MIN_OPERATING_TEMP_C}C - HDPE becomes brittle`,
    );
  }

  if (temperatureC > HDPE_MAX_CONTINUOUS_TEMP_C) {
    errors.push(
      `Operating temperature ${temperatureC}C exceeds maximum continuous ${HDPE_MAX_CONTINUOUS_TEMP_C}C`,
    );
  }

  if (temperatureC > HDPE_MAX_SHORT_TERM_TEMP_C) {
    errors.push(
      `Operating temperature ${temperatureC}C exceeds maximum short-term ${HDPE_MAX_SHORT_TERM_TEMP_C}C - material degradation will occur`,
    );
  }

  const { deratedPnBar, factor } = deratedPressure(basePnBar, temperatureC);

  if (deratedPnBar < requiredPnBar) {
    errors.push(
      `Derated pressure ${deratedPnBar} bar (factor ${factor}) is below required ${requiredPnBar} bar - select higher SDR`,
    );
  }

  if (temperatureC > 40 && factor < 0.8) {
    warnings.push(
      `Significant pressure derating at ${temperatureC}C (factor ${factor}) - consider application review`,
    );
  }

  return {
    valid: errors.length === 0,
    warnings,
    errors,
  };
};

export const temperatureForDeratingFactor = (targetFactor: number): number | null => {
  if (targetFactor >= 1.0) {
    return 20;
  }
  if (targetFactor <= 0.5) {
    return 60;
  }

  const sortedPoints = [...HDPE_TEMPERATURE_DERATING].sort((a, b) => b.factor - a.factor);

  const upperIndex = sortedPoints.findIndex((p) => p.factor < targetFactor);
  if (upperIndex <= 0) {
    return null;
  }

  const higher = sortedPoints[upperIndex - 1];
  const lower = sortedPoints[upperIndex];

  const factorRange = higher.factor - lower.factor;
  const factorOffset = higher.factor - targetFactor;
  const ratio = factorOffset / factorRange;

  const tempRange = lower.temperatureC - higher.temperatureC;
  const interpolatedTemp = higher.temperatureC + tempRange * ratio;

  return Math.round(interpolatedTemp);
};
