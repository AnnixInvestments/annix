// Pumps & Pump Parts Module - Calculations and Unit Conversions
// Flow, pressure, viscosity conversions and NPSH calculations

// ============================================
// FLOW RATE CONVERSIONS
// ============================================

export const flowConversions = {
  m3hToLs: (m3h: number): number => m3h / 3.6,
  lsToM3h: (ls: number): number => ls * 3.6,
  m3hToGpm: (m3h: number): number => m3h * 4.40287,
  gpmToM3h: (gpm: number): number => gpm / 4.40287,
  lsToGpm: (ls: number): number => ls * 15.8503,
  gpmToLs: (gpm: number): number => gpm / 15.8503,
  m3hToM3s: (m3h: number): number => m3h / 3600,
  m3sToM3h: (m3s: number): number => m3s * 3600,
};

export type FlowUnit = 'm3/h' | 'l/s' | 'GPM' | 'm3/s';

export const convertFlow = (value: number, from: FlowUnit, to: FlowUnit): number => {
  if (from === to) return value;

  const toM3h: Record<FlowUnit, (v: number) => number> = {
    'm3/h': (v) => v,
    'l/s': flowConversions.lsToM3h,
    'GPM': flowConversions.gpmToM3h,
    'm3/s': flowConversions.m3sToM3h,
  };

  const fromM3h: Record<FlowUnit, (v: number) => number> = {
    'm3/h': (v) => v,
    'l/s': flowConversions.m3hToLs,
    'GPM': flowConversions.m3hToGpm,
    'm3/s': flowConversions.m3hToM3s,
  };

  const m3hValue = toM3h[from](value);
  return fromM3h[to](m3hValue);
};

// ============================================
// PRESSURE CONVERSIONS
// ============================================

export const pressureConversions = {
  barToPsi: (bar: number): number => bar * 14.5038,
  psiToBar: (psi: number): number => psi / 14.5038,
  barToKpa: (bar: number): number => bar * 100,
  kpaToBar: (kpa: number): number => kpa / 100,
  barToMpa: (bar: number): number => bar / 10,
  mpaToBar: (mpa: number): number => mpa * 10,
  barToMwc: (bar: number): number => bar * 10.197,
  mwcToBar: (mwc: number): number => mwc / 10.197,
  psiToKpa: (psi: number): number => psi * 6.89476,
  kpaToPsi: (kpa: number): number => kpa / 6.89476,
};

export type PressureUnit = 'bar' | 'psi' | 'kPa' | 'MPa' | 'mWC';

export const convertPressure = (value: number, from: PressureUnit, to: PressureUnit): number => {
  if (from === to) return value;

  const toBar: Record<PressureUnit, (v: number) => number> = {
    'bar': (v) => v,
    'psi': pressureConversions.psiToBar,
    'kPa': pressureConversions.kpaToBar,
    'MPa': pressureConversions.mpaToBar,
    'mWC': pressureConversions.mwcToBar,
  };

  const fromBar: Record<PressureUnit, (v: number) => number> = {
    'bar': (v) => v,
    'psi': pressureConversions.barToPsi,
    'kPa': pressureConversions.barToKpa,
    'MPa': pressureConversions.barToMpa,
    'mWC': pressureConversions.barToMwc,
  };

  const barValue = toBar[from](value);
  return fromBar[to](barValue);
};

// ============================================
// VISCOSITY CONVERSIONS
// ============================================

export const viscosityConversions = {
  cpToCst: (cp: number, sg: number): number => cp / sg,
  cstToCp: (cst: number, sg: number): number => cst * sg,
  cpToPas: (cp: number): number => cp / 1000,
  pasToCp: (pas: number): number => pas * 1000,
  cstToM2s: (cst: number): number => cst / 1000000,
  m2sToCst: (m2s: number): number => m2s * 1000000,
};

export type ViscosityUnit = 'cP' | 'cSt' | 'Pa·s' | 'm²/s';

export const convertViscosity = (
  value: number,
  from: ViscosityUnit,
  to: ViscosityUnit,
  specificGravity: number = 1.0
): number => {
  if (from === to) return value;

  const toCp: Record<ViscosityUnit, (v: number, sg: number) => number> = {
    'cP': (v) => v,
    'cSt': viscosityConversions.cstToCp,
    'Pa·s': (v) => viscosityConversions.pasToCp(v),
    'm²/s': (v, sg) => viscosityConversions.cstToCp(viscosityConversions.m2sToCst(v), sg),
  };

  const fromCp: Record<ViscosityUnit, (v: number, sg: number) => number> = {
    'cP': (v) => v,
    'cSt': viscosityConversions.cpToCst,
    'Pa·s': (v) => viscosityConversions.cpToPas(v),
    'm²/s': (v, sg) => viscosityConversions.cstToM2s(viscosityConversions.cpToCst(v, sg)),
  };

  const cpValue = toCp[from](value, specificGravity);
  return fromCp[to](cpValue, specificGravity);
};

// ============================================
// NPSH CALCULATIONS
// ============================================

const ATMOSPHERIC_PRESSURE_M = 10.33;
const GRAVITY = 9.81;

export interface NpshCalculationParams {
  atmosphericPressureBar?: number;
  liquidVaporPressureBar: number;
  staticSuctionHeadM: number;
  frictionLossM: number;
  specificGravity?: number;
}

export const calculateNpshAvailable = (params: NpshCalculationParams): number => {
  const sg = params.specificGravity ?? 1.0;
  const atmosphericHead = params.atmosphericPressureBar
    ? (params.atmosphericPressureBar * 100000) / (sg * 1000 * GRAVITY)
    : ATMOSPHERIC_PRESSURE_M / sg;

  const vaporHead = (params.liquidVaporPressureBar * 100000) / (sg * 1000 * GRAVITY);

  return atmosphericHead + params.staticSuctionHeadM - vaporHead - params.frictionLossM;
};

export const checkNpshMargin = (
  npshAvailable: number,
  npshRequired: number,
  safetyMargin: number = 0.5
): {
  isAdequate: boolean;
  margin: number;
  marginPercent: number;
  recommendation: string;
} => {
  const margin = npshAvailable - npshRequired;
  const marginPercent = (margin / npshRequired) * 100;
  const isAdequate = margin >= safetyMargin;

  const recommendation = isAdequate
    ? margin >= 1.0
      ? 'Excellent NPSH margin - pump should operate without cavitation'
      : 'Acceptable NPSH margin - monitor for signs of cavitation'
    : margin >= 0
      ? 'Marginal NPSH - consider increasing suction head or reducing losses'
      : 'Insufficient NPSH - pump will cavitate. Redesign suction system required';

  return {
    isAdequate,
    margin: Math.round(margin * 100) / 100,
    marginPercent: Math.round(marginPercent * 10) / 10,
    recommendation,
  };
};

// Water vapor pressure at temperature (simplified approximation)
export const waterVaporPressure = (tempC: number): number => {
  if (tempC < 0 || tempC > 100) {
    throw new Error('Temperature must be between 0°C and 100°C for water');
  }
  return 0.0006112 * Math.exp((17.67 * tempC) / (tempC + 243.5));
};

// ============================================
// PUMP CURVE DATA STRUCTURES
// ============================================

export interface PumpCurvePoint {
  flowM3h: number;
  headM: number;
  efficiencyPercent?: number;
  powerKw?: number;
  npshRequiredM?: number;
}

export interface PumpCurve {
  pumpModel: string;
  impellerDiameterMm: number;
  speedRpm: number;
  points: PumpCurvePoint[];
  shutoffHeadM: number;
  bestEfficiencyPoint: {
    flowM3h: number;
    headM: number;
    efficiencyPercent: number;
  };
  minContinuousFlowM3h: number;
  maxFlowM3h: number;
}

export const interpolatePumpCurve = (
  curve: PumpCurve,
  targetFlowM3h: number
): { headM: number; efficiencyPercent?: number } | null => {
  if (targetFlowM3h < 0 || targetFlowM3h > curve.maxFlowM3h) {
    return null;
  }

  const sortedPoints = [...curve.points].sort((a, b) => a.flowM3h - b.flowM3h);

  if (targetFlowM3h <= sortedPoints[0].flowM3h) {
    return {
      headM: sortedPoints[0].headM,
      efficiencyPercent: sortedPoints[0].efficiencyPercent,
    };
  }

  const upperIndex = sortedPoints.findIndex((p) => p.flowM3h >= targetFlowM3h);
  if (upperIndex === -1) {
    const last = sortedPoints[sortedPoints.length - 1];
    return { headM: last.headM, efficiencyPercent: last.efficiencyPercent };
  }

  const lower = sortedPoints[upperIndex - 1];
  const upper = sortedPoints[upperIndex];
  const ratio = (targetFlowM3h - lower.flowM3h) / (upper.flowM3h - lower.flowM3h);

  const headM = lower.headM + ratio * (upper.headM - lower.headM);
  const efficiencyPercent =
    lower.efficiencyPercent && upper.efficiencyPercent
      ? lower.efficiencyPercent + ratio * (upper.efficiencyPercent - lower.efficiencyPercent)
      : undefined;

  return { headM, efficiencyPercent };
};

// ============================================
// HYDRAULIC POWER CALCULATIONS
// ============================================

export const calculateHydraulicPower = (
  flowM3h: number,
  headM: number,
  specificGravity: number = 1.0
): number => {
  const flowM3s = flowM3h / 3600;
  const densityKgM3 = specificGravity * 1000;
  return (densityKgM3 * GRAVITY * flowM3s * headM) / 1000;
};

export const calculateShaftPower = (
  hydraulicPowerKw: number,
  pumpEfficiencyPercent: number
): number => {
  return hydraulicPowerKw / (pumpEfficiencyPercent / 100);
};

export const calculateMotorPower = (
  shaftPowerKw: number,
  serviceFactorPercent: number = 115
): number => {
  return shaftPowerKw * (serviceFactorPercent / 100);
};

export const selectNextMotorSize = (requiredPowerKw: number): number => {
  const standardSizes = [
    0.37, 0.55, 0.75, 1.1, 1.5, 2.2, 3, 4, 5.5, 7.5, 11, 15, 18.5, 22, 30, 37, 45, 55, 75, 90, 110,
    132, 160, 200, 250, 315, 355, 400, 450, 500, 560, 630, 710, 800, 900, 1000,
  ];

  const nextSize = standardSizes.find((size) => size >= requiredPowerKw);
  return nextSize ?? standardSizes[standardSizes.length - 1];
};

// ============================================
// PUMP SELECTION HELPER
// ============================================

export interface PumpSelectionResult {
  hydraulicPowerKw: number;
  estimatedShaftPowerKw: number;
  recommendedMotorKw: number;
  npshRequired: number;
  flowRangeRecommendation: string;
}

export const estimatePumpRequirements = (
  flowM3h: number,
  headM: number,
  specificGravity: number = 1.0,
  estimatedEfficiencyPercent: number = 70,
  estimatedNpshRequiredM: number = 3
): PumpSelectionResult => {
  const hydraulicPowerKw = calculateHydraulicPower(flowM3h, headM, specificGravity);
  const shaftPowerKw = calculateShaftPower(hydraulicPowerKw, estimatedEfficiencyPercent);
  const motorPowerRequired = calculateMotorPower(shaftPowerKw);
  const recommendedMotorKw = selectNextMotorSize(motorPowerRequired);

  const bepFlow = flowM3h;
  const minFlow = bepFlow * 0.6;
  const maxFlow = bepFlow * 1.2;

  return {
    hydraulicPowerKw: Math.round(hydraulicPowerKw * 100) / 100,
    estimatedShaftPowerKw: Math.round(shaftPowerKw * 100) / 100,
    recommendedMotorKw,
    npshRequired: estimatedNpshRequiredM,
    flowRangeRecommendation: `Recommended operating range: ${Math.round(minFlow)}-${Math.round(maxFlow)} m³/h`,
  };
};
