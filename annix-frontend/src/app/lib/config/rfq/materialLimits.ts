export interface MaterialLimits {
  minTempC: number;
  maxTempC: number;
  maxPressureBar: number;
  type: string;
  notes?: string;
  pNumber?: number;
  pGroup?: number;
  defaultGrade?: string;
}

export const MATERIAL_LIMITS: Record<string, MaterialLimits> = {
  "SABS 62": {
    minTempC: -20,
    maxTempC: 400,
    maxPressureBar: 100,
    type: "Carbon Steel ERW",
    notes: "General purpose ERW pipe",
    pNumber: 1,
    pGroup: 1,
  },
  "SABS 719": {
    minTempC: -20,
    maxTempC: 400,
    maxPressureBar: 100,
    type: "Carbon Steel ERW",
    notes: "Large bore ERW pipe",
    pNumber: 1,
    pGroup: 1,
  },
  "ASTM A106 Gr. A": {
    minTempC: -29,
    maxTempC: 427,
    maxPressureBar: 400,
    type: "Carbon Steel Seamless",
    notes: "High temperature seamless pipe",
    pNumber: 1,
    pGroup: 1,
    defaultGrade: "A",
  },
  "ASTM A106 Gr. B": {
    minTempC: -29,
    maxTempC: 427,
    maxPressureBar: 400,
    type: "Carbon Steel Seamless",
    notes: "High temperature seamless pipe",
    pNumber: 1,
    pGroup: 1,
    defaultGrade: "B",
  },
  "ASTM A106 Gr. C": {
    minTempC: -29,
    maxTempC: 427,
    maxPressureBar: 400,
    type: "Carbon Steel Seamless",
    notes: "High temperature seamless pipe (higher strength)",
    pNumber: 1,
    pGroup: 2,
    defaultGrade: "C",
  },
  "ASTM A106": {
    minTempC: -29,
    maxTempC: 427,
    maxPressureBar: 400,
    type: "Carbon Steel Seamless",
    notes: "High temperature seamless pipe",
    pNumber: 1,
    pGroup: 1,
    defaultGrade: "B",
  },
  "ASTM A53 Gr. A": {
    minTempC: -29,
    maxTempC: 400,
    maxPressureBar: 250,
    type: "Carbon Steel",
    notes: "General purpose pipe",
    pNumber: 1,
    pGroup: 1,
    defaultGrade: "A",
  },
  "ASTM A53 Gr. B": {
    minTempC: -29,
    maxTempC: 400,
    maxPressureBar: 250,
    type: "Carbon Steel",
    notes: "General purpose pipe",
    pNumber: 1,
    pGroup: 1,
    defaultGrade: "B",
  },
  "ASTM A53": {
    minTempC: -29,
    maxTempC: 400,
    maxPressureBar: 250,
    type: "Carbon Steel",
    notes: "General purpose pipe - seamless or welded",
    pNumber: 1,
    pGroup: 1,
    defaultGrade: "B",
  },
  "ASTM A333 Gr. 6": {
    minTempC: -100,
    maxTempC: 400,
    maxPressureBar: 250,
    type: "Low-Temp Carbon Steel",
    notes: "For temperatures down to -46°C",
    pNumber: 1,
    pGroup: 1,
    defaultGrade: "6",
  },
  "ASTM A333 Gr. 3": {
    minTempC: -100,
    maxTempC: 400,
    maxPressureBar: 250,
    type: "Low-Temp 3.5Ni Steel",
    notes: "For temperatures down to -100°C",
    pNumber: 9,
    pGroup: 1,
    defaultGrade: "3",
  },
  "ASTM A333 Gr. 8": {
    minTempC: -196,
    maxTempC: 400,
    maxPressureBar: 250,
    type: "Cryogenic 9Ni Steel",
    notes: "For cryogenic service down to -196°C",
    pNumber: 11,
    pGroup: 1,
    defaultGrade: "8",
  },
  "ASTM A333": {
    minTempC: -100,
    maxTempC: 400,
    maxPressureBar: 250,
    type: "Low-Temp Carbon Steel",
    notes: "For temperatures down to -100°C",
    pNumber: 1,
    pGroup: 1,
    defaultGrade: "6",
  },
  "API 5L Gr. B": {
    minTempC: -29,
    maxTempC: 400,
    maxPressureBar: 250,
    type: "Line Pipe Carbon Steel",
    notes: "Oil and gas pipeline",
    pNumber: 1,
    pGroup: 1,
    defaultGrade: "B",
  },
  "API 5L X52": {
    minTempC: -29,
    maxTempC: 400,
    maxPressureBar: 250,
    type: "Line Pipe Carbon Steel",
    notes: "Higher strength pipeline",
    pNumber: 1,
    pGroup: 2,
    defaultGrade: "X52",
  },
  "API 5L X60": {
    minTempC: -29,
    maxTempC: 400,
    maxPressureBar: 250,
    type: "Line Pipe Carbon Steel",
    notes: "High strength pipeline",
    pNumber: 1,
    pGroup: 2,
    defaultGrade: "X60",
  },
  "API 5L": {
    minTempC: -29,
    maxTempC: 400,
    maxPressureBar: 250,
    type: "Line Pipe Carbon Steel",
    notes: "Oil and gas pipeline",
    pNumber: 1,
    pGroup: 1,
    defaultGrade: "B",
  },
  "ASTM A179": {
    minTempC: -29,
    maxTempC: 400,
    maxPressureBar: 160,
    type: "Heat Exchanger Tube",
    notes: "Cold-drawn seamless",
    pNumber: 1,
    pGroup: 1,
  },
  "ASTM A192": {
    minTempC: -29,
    maxTempC: 454,
    maxPressureBar: 250,
    type: "Boiler Tube",
    notes: "High-pressure boiler service",
    pNumber: 1,
    pGroup: 1,
  },
  "ASTM A500": {
    minTempC: -29,
    maxTempC: 200,
    maxPressureBar: 100,
    type: "Structural Tubing",
    notes: "Not for pressure service",
  },
  "ASTM A335 P1": {
    minTempC: -29,
    maxTempC: 538,
    maxPressureBar: 400,
    type: "Alloy Steel 0.5Mo",
    notes: "Elevated temperature service",
    pNumber: 3,
    pGroup: 1,
    defaultGrade: "P1",
  },
  "ASTM A335 P11": {
    minTempC: -29,
    maxTempC: 593,
    maxPressureBar: 400,
    type: "Alloy Steel 1.25Cr-0.5Mo",
    notes: "High temperature service",
    pNumber: 4,
    pGroup: 1,
    defaultGrade: "P11",
  },
  "ASTM A335 P12": {
    minTempC: -29,
    maxTempC: 593,
    maxPressureBar: 400,
    type: "Alloy Steel 1Cr-0.5Mo",
    notes: "High temperature service",
    pNumber: 4,
    pGroup: 1,
    defaultGrade: "P12",
  },
  "ASTM A335 P22": {
    minTempC: -29,
    maxTempC: 593,
    maxPressureBar: 400,
    type: "Alloy Steel 2.25Cr-1Mo",
    notes: "High temperature service",
    pNumber: 5,
    pGroup: 1,
    defaultGrade: "P22",
  },
  "ASTM A335 P5": {
    minTempC: -29,
    maxTempC: 593,
    maxPressureBar: 400,
    type: "Alloy Steel 5Cr-0.5Mo",
    notes: "High temperature service",
    pNumber: 5,
    pGroup: 1,
    defaultGrade: "P5",
  },
  "ASTM A335 P9": {
    minTempC: -29,
    maxTempC: 593,
    maxPressureBar: 400,
    type: "Alloy Steel 9Cr-1Mo",
    notes: "High temperature service",
    pNumber: 5,
    pGroup: 1,
    defaultGrade: "P9",
  },
  "ASTM A335 P91": {
    minTempC: -29,
    maxTempC: 649,
    maxPressureBar: 400,
    type: "Alloy Steel 9Cr-1Mo-V",
    notes: "Advanced high temperature service",
    pNumber: 15,
    pGroup: 1,
    defaultGrade: "P91",
  },
  "ASTM A335 P92": {
    minTempC: -29,
    maxTempC: 649,
    maxPressureBar: 400,
    type: "Alloy Steel 9Cr-2W",
    notes: "Advanced high temperature service",
    pNumber: 15,
    pGroup: 1,
    defaultGrade: "P92",
  },
  "ASTM A335": {
    minTempC: -29,
    maxTempC: 593,
    maxPressureBar: 400,
    type: "Alloy Steel Chrome-Moly",
    notes: "High temperature alloy",
    pNumber: 4,
    pGroup: 1,
  },
  "ASTM A312 TP304": {
    minTempC: -196,
    maxTempC: 816,
    maxPressureBar: 400,
    type: "Stainless Steel 18Cr-8Ni",
    notes: "General purpose austenitic",
    pNumber: 8,
    pGroup: 1,
    defaultGrade: "TP304",
  },
  "ASTM A312 TP304L": {
    minTempC: -196,
    maxTempC: 816,
    maxPressureBar: 400,
    type: "Stainless Steel 18Cr-8Ni Low C",
    notes: "Improved weldability",
    pNumber: 8,
    pGroup: 1,
    defaultGrade: "TP304L",
  },
  "ASTM A312 TP316": {
    minTempC: -196,
    maxTempC: 816,
    maxPressureBar: 400,
    type: "Stainless Steel 16Cr-12Ni-2Mo",
    notes: "Improved corrosion resistance",
    pNumber: 8,
    pGroup: 1,
    defaultGrade: "TP316",
  },
  "ASTM A312 TP316L": {
    minTempC: -196,
    maxTempC: 816,
    maxPressureBar: 400,
    type: "Stainless Steel 16Cr-12Ni-2Mo Low C",
    notes: "Improved weldability + corrosion resistance",
    pNumber: 8,
    pGroup: 1,
    defaultGrade: "TP316L",
  },
  "ASTM A312 TP321": {
    minTempC: -196,
    maxTempC: 816,
    maxPressureBar: 400,
    type: "Stainless Steel 18Cr-10Ni-Ti",
    notes: "Stabilized for high temperature",
    pNumber: 8,
    pGroup: 1,
    defaultGrade: "TP321",
  },
  "ASTM A312 TP347": {
    minTempC: -196,
    maxTempC: 816,
    maxPressureBar: 400,
    type: "Stainless Steel 18Cr-10Ni-Nb",
    notes: "Stabilized for high temperature",
    pNumber: 8,
    pGroup: 1,
    defaultGrade: "TP347",
  },
  "ASTM A312 TP309S": {
    minTempC: -196,
    maxTempC: 1038,
    maxPressureBar: 400,
    type: "Stainless Steel 23Cr-12Ni",
    notes: "High temperature oxidation resistance",
    pNumber: 8,
    pGroup: 2,
    defaultGrade: "TP309S",
  },
  "ASTM A312 TP310S": {
    minTempC: -196,
    maxTempC: 1093,
    maxPressureBar: 400,
    type: "Stainless Steel 25Cr-20Ni",
    notes: "Highest temperature austenitic",
    pNumber: 8,
    pGroup: 2,
    defaultGrade: "TP310S",
  },
  "ASTM A312": {
    minTempC: -196,
    maxTempC: 816,
    maxPressureBar: 400,
    type: "Stainless Steel",
    notes: "Austenitic stainless - wide temp range",
    pNumber: 8,
    pGroup: 1,
    defaultGrade: "TP304",
  },
  "ASTM A358": {
    minTempC: -196,
    maxTempC: 816,
    maxPressureBar: 400,
    type: "Stainless Steel Welded",
    notes: "Electric-fusion welded stainless",
    pNumber: 8,
    pGroup: 1,
  },
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
  pressureBar: number | undefined,
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
      warnings.push(
        `Temperature ${temperatureC}°C is below minimum ${limits.minTempC}°C for ${steelSpecName}`,
      );
    }
    if (temperatureC > limits.maxTempC) {
      isSuitable = false;
      warnings.push(
        `Temperature ${temperatureC}°C exceeds maximum ${limits.maxTempC}°C for ${steelSpecName}`,
      );
    }
  }

  if (pressureBar !== undefined && pressureBar > limits.maxPressureBar) {
    warnings.push(
      `Pressure ${pressureBar} bar may require special consideration for ${steelSpecName} (typical max: ${limits.maxPressureBar} bar)`,
    );
  }

  let recommendation: string | undefined;
  if (!isSuitable) {
    if (temperatureC !== undefined && temperatureC > 400) {
      recommendation =
        "Consider ASTM A106 Grade B (up to 427°C), ASTM A335 P11/P22 (up to 593°C), or ASTM A312 stainless (up to 816°C)";
    } else if (temperatureC !== undefined && temperatureC < -29) {
      recommendation =
        "Consider ASTM A333 Grade 6 (down to -100°C) or ASTM A312 stainless (down to -196°C)";
    }
  }

  return { isSuitable, warnings, recommendation, limits };
};

export const suitableMaterials = (
  temperatureC: number | undefined,
  pressureBar: number | undefined,
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
