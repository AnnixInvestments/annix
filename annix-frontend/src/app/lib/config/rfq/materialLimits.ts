export interface MaterialLimits {
  minTempC: number;
  maxTempC: number;
  maxPressureBar: number;
  type: string;
  notes?: string;
}

export const MATERIAL_LIMITS: Record<string, MaterialLimits> = {
  'SABS 62': { minTempC: -20, maxTempC: 400, maxPressureBar: 100, type: 'Carbon Steel ERW', notes: 'General purpose ERW pipe' },
  'SABS 719': { minTempC: -20, maxTempC: 400, maxPressureBar: 100, type: 'Carbon Steel ERW', notes: 'Large bore ERW pipe' },
  'ASTM A106': { minTempC: -29, maxTempC: 427, maxPressureBar: 400, type: 'Carbon Steel Seamless', notes: 'High temperature seamless pipe' },
  'ASTM A53': { minTempC: -29, maxTempC: 400, maxPressureBar: 250, type: 'Carbon Steel', notes: 'General purpose pipe - seamless or welded' },
  'ASTM A333': { minTempC: -100, maxTempC: 400, maxPressureBar: 250, type: 'Low-Temp Carbon Steel', notes: 'For temperatures down to -100°C' },
  'API 5L': { minTempC: -29, maxTempC: 400, maxPressureBar: 250, type: 'Line Pipe Carbon Steel', notes: 'Oil and gas pipeline' },
  'ASTM A179': { minTempC: -29, maxTempC: 400, maxPressureBar: 160, type: 'Heat Exchanger Tube', notes: 'Cold-drawn seamless' },
  'ASTM A192': { minTempC: -29, maxTempC: 454, maxPressureBar: 250, type: 'Boiler Tube', notes: 'High-pressure boiler service' },
  'ASTM A500': { minTempC: -29, maxTempC: 200, maxPressureBar: 100, type: 'Structural Tubing', notes: 'Not for pressure service' },
  'ASTM A335 P11': { minTempC: -29, maxTempC: 593, maxPressureBar: 400, type: 'Alloy Steel 1.25Cr-0.5Mo', notes: 'High temperature service' },
  'ASTM A335 P22': { minTempC: -29, maxTempC: 593, maxPressureBar: 400, type: 'Alloy Steel 2.25Cr-1Mo', notes: 'High temperature service' },
  'ASTM A335': { minTempC: -29, maxTempC: 593, maxPressureBar: 400, type: 'Alloy Steel Chrome-Moly', notes: 'High temperature alloy' },
  'ASTM A312': { minTempC: -196, maxTempC: 816, maxPressureBar: 400, type: 'Stainless Steel', notes: 'Austenitic stainless - wide temp range' },
  'ASTM A358': { minTempC: -196, maxTempC: 816, maxPressureBar: 400, type: 'Stainless Steel Welded', notes: 'Electric-fusion welded stainless' },
};

export const materialLimits = (steelSpecName: string): MaterialLimits | null => {
  if (!steelSpecName) return null;
  for (const [pattern, limits] of Object.entries(MATERIAL_LIMITS)) {
    if (steelSpecName.includes(pattern)) {
      return limits;
    }
  }
  return null;
};

export interface MaterialSuitabilityResult {
  isSuitable: boolean;
  warnings: string[];
  recommendation?: string;
  limits?: MaterialLimits;
}

export const checkMaterialSuitability = (
  steelSpecName: string,
  temperatureC: number | undefined,
  pressureBar: number | undefined
): MaterialSuitabilityResult => {
  const limits = materialLimits(steelSpecName);
  const warnings: string[] = [];

  if (!limits) {
    return { isSuitable: true, warnings: [], limits: undefined };
  }

  let isSuitable = true;

  if (temperatureC !== undefined) {
    if (temperatureC < limits.minTempC) {
      isSuitable = false;
      warnings.push(`Temperature ${temperatureC}°C is below minimum ${limits.minTempC}°C for ${steelSpecName}`);
    }
    if (temperatureC > limits.maxTempC) {
      isSuitable = false;
      warnings.push(`Temperature ${temperatureC}°C exceeds maximum ${limits.maxTempC}°C for ${steelSpecName}`);
    }
  }

  if (pressureBar !== undefined && pressureBar > limits.maxPressureBar) {
    warnings.push(`Pressure ${pressureBar} bar may require special consideration for ${steelSpecName} (typical max: ${limits.maxPressureBar} bar)`);
  }

  let recommendation: string | undefined;
  if (!isSuitable) {
    if (temperatureC !== undefined && temperatureC > 400) {
      recommendation = 'Consider ASTM A106 Grade B (up to 427°C), ASTM A335 P11/P22 (up to 593°C), or ASTM A312 stainless (up to 816°C)';
    } else if (temperatureC !== undefined && temperatureC < -29) {
      recommendation = 'Consider ASTM A333 Grade 6 (down to -100°C) or ASTM A312 stainless (down to -196°C)';
    }
  }

  return { isSuitable, warnings, recommendation, limits };
};

export const suitableMaterials = (
  temperatureC: number | undefined,
  pressureBar: number | undefined
): string[] => {
  const suitable: string[] = [];

  for (const [pattern, limits] of Object.entries(MATERIAL_LIMITS)) {
    let isOk = true;

    if (temperatureC !== undefined) {
      if (temperatureC < limits.minTempC || temperatureC > limits.maxTempC) {
        isOk = false;
      }
    }

    if (pressureBar !== undefined && pressureBar > limits.maxPressureBar) {
      isOk = false;
    }

    if (isOk) {
      suitable.push(pattern);
    }
  }

  return suitable;
};
