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

export type FlowUnit = "m3/h" | "l/s" | "GPM" | "m3/s";

export const convertFlow = (value: number, from: FlowUnit, to: FlowUnit): number => {
  if (from === to) return value;

  const toM3h: Record<FlowUnit, (v: number) => number> = {
    "m3/h": (v) => v,
    "l/s": flowConversions.lsToM3h,
    GPM: flowConversions.gpmToM3h,
    "m3/s": flowConversions.m3sToM3h,
  };

  const fromM3h: Record<FlowUnit, (v: number) => number> = {
    "m3/h": (v) => v,
    "l/s": flowConversions.m3hToLs,
    GPM: flowConversions.m3hToGpm,
    "m3/s": flowConversions.m3hToM3s,
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

export type PressureUnit = "bar" | "psi" | "kPa" | "MPa" | "mWC";

export const convertPressure = (value: number, from: PressureUnit, to: PressureUnit): number => {
  if (from === to) return value;

  const toBar: Record<PressureUnit, (v: number) => number> = {
    bar: (v) => v,
    psi: pressureConversions.psiToBar,
    kPa: pressureConversions.kpaToBar,
    MPa: pressureConversions.mpaToBar,
    mWC: pressureConversions.mwcToBar,
  };

  const fromBar: Record<PressureUnit, (v: number) => number> = {
    bar: (v) => v,
    psi: pressureConversions.barToPsi,
    kPa: pressureConversions.barToKpa,
    MPa: pressureConversions.barToMpa,
    mWC: pressureConversions.barToMwc,
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

export type ViscosityUnit = "cP" | "cSt" | "Pa·s" | "m²/s";

export const convertViscosity = (
  value: number,
  from: ViscosityUnit,
  to: ViscosityUnit,
  specificGravity: number = 1.0,
): number => {
  if (from === to) return value;

  const toCp: Record<ViscosityUnit, (v: number, sg: number) => number> = {
    cP: (v) => v,
    cSt: viscosityConversions.cstToCp,
    Pa·s: (v) => viscosityConversions.pasToCp(v),
    "m²/s": (v, sg) => viscosityConversions.cstToCp(viscosityConversions.m2sToCst(v), sg),
  };

  const fromCp: Record<ViscosityUnit, (v: number, sg: number) => number> = {
    cP: (v) => v,
    cSt: viscosityConversions.cpToCst,
    Pa·s: (v) => viscosityConversions.cpToPas(v),
    "m²/s": (v, sg) => viscosityConversions.cstToM2s(viscosityConversions.cpToCst(v, sg)),
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
  safetyMargin: number = 0.5,
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
      ? "Excellent NPSH margin - pump should operate without cavitation"
      : "Acceptable NPSH margin - monitor for signs of cavitation"
    : margin >= 0
      ? "Marginal NPSH - consider increasing suction head or reducing losses"
      : "Insufficient NPSH - pump will cavitate. Redesign suction system required";

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
    throw new Error("Temperature must be between 0°C and 100°C for water");
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
  targetFlowM3h: number,
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
  specificGravity: number = 1.0,
): number => {
  const flowM3s = flowM3h / 3600;
  const densityKgM3 = specificGravity * 1000;
  return (densityKgM3 * GRAVITY * flowM3s * headM) / 1000;
};

export const calculateShaftPower = (
  hydraulicPowerKw: number,
  pumpEfficiencyPercent: number,
): number => {
  return hydraulicPowerKw / (pumpEfficiencyPercent / 100);
};

export const calculateMotorPower = (
  shaftPowerKw: number,
  serviceFactorPercent: number = 115,
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
  estimatedNpshRequiredM: number = 3,
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

// ============================================
// VALVE Cv (FLOW COEFFICIENT) CALCULATIONS
// ============================================

export interface CvCalculationParams {
  flowRateGpm: number;
  pressureDropPsi: number;
  specificGravity?: number;
}

export interface CvLiquidResult {
  cv: number;
  flowRateGpm: number;
  pressureDropPsi: number;
  specificGravity: number;
}

export const calculateCvLiquid = (params: CvCalculationParams): CvLiquidResult => {
  const sg = params.specificGravity ?? 1.0;
  const cv = params.flowRateGpm * Math.sqrt(sg / params.pressureDropPsi);

  return {
    cv: Math.round(cv * 100) / 100,
    flowRateGpm: params.flowRateGpm,
    pressureDropPsi: params.pressureDropPsi,
    specificGravity: sg,
  };
};

export const calculateFlowFromCv = (
  cv: number,
  pressureDropPsi: number,
  specificGravity: number = 1.0,
): number => {
  return cv * Math.sqrt(pressureDropPsi / specificGravity);
};

export const calculatePressureDropFromCv = (
  cv: number,
  flowRateGpm: number,
  specificGravity: number = 1.0,
): number => {
  return specificGravity * (flowRateGpm / cv) ** 2;
};

export interface CvGasParams {
  flowRateScfh: number;
  upstreamPressurePsia: number;
  downstreamPressurePsia: number;
  temperatureF: number;
  specificGravityGas?: number;
}

export const calculateCvGas = (params: CvGasParams): number => {
  const sg = params.specificGravityGas ?? 1.0;
  const T = params.temperatureF + 460;
  const P1 = params.upstreamPressurePsia;
  const P2 = params.downstreamPressurePsia;
  const Q = params.flowRateScfh;

  const deltaP = P1 - P2;
  const Pm = (P1 + P2) / 2;

  if (deltaP / P1 < 0.02) {
    return (Q / 963) * Math.sqrt((sg * T) / (deltaP * Pm));
  }

  const Y = 1 - deltaP / (3 * P1);
  return (Q / (963 * Y)) * Math.sqrt((sg * T) / (deltaP * P1));
};

// ============================================
// VALVE SIZING CALCULATOR
// ============================================

export interface ValveSizingParams {
  flowRateM3h: number;
  inletPressureBar: number;
  outletPressureBar: number;
  specificGravity?: number;
  allowedPressureRecovery?: number;
}

export interface ValveSizingResult {
  requiredCv: number;
  flowRateGpm: number;
  pressureDropPsi: number;
  recommendedValveSize: string;
  cavitationIndex: number;
  cavitationWarning: string | null;
}

const STANDARD_VALVE_CVS: { size: string; cv: number }[] = [
  { size: 'DN15 (1/2")', cv: 4.6 },
  { size: 'DN20 (3/4")', cv: 8.4 },
  { size: 'DN25 (1")', cv: 14 },
  { size: 'DN32 (1-1/4")', cv: 24 },
  { size: 'DN40 (1-1/2")', cv: 35 },
  { size: 'DN50 (2")', cv: 55 },
  { size: 'DN65 (2-1/2")', cv: 83 },
  { size: 'DN80 (3")', cv: 120 },
  { size: 'DN100 (4")', cv: 195 },
  { size: 'DN125 (5")', cv: 310 },
  { size: 'DN150 (6")', cv: 440 },
  { size: 'DN200 (8")', cv: 780 },
  { size: 'DN250 (10")', cv: 1200 },
  { size: 'DN300 (12")', cv: 1750 },
  { size: 'DN350 (14")', cv: 2350 },
  { size: 'DN400 (16")', cv: 3100 },
];

export const calculateValveSizing = (params: ValveSizingParams): ValveSizingResult => {
  const sg = params.specificGravity ?? 1.0;
  const flowGpm = flowConversions.m3hToGpm(params.flowRateM3h);
  const pressureDropBar = params.inletPressureBar - params.outletPressureBar;
  const pressureDropPsi = pressureConversions.barToPsi(pressureDropBar);

  const cvResult = calculateCvLiquid({
    flowRateGpm: flowGpm,
    pressureDropPsi: pressureDropPsi,
    specificGravity: sg,
  });

  const safetyFactor = 1.25;
  const requiredCv = cvResult.cv * safetyFactor;

  const recommendedValve =
    STANDARD_VALVE_CVS.find((v) => v.cv >= requiredCv) ||
    STANDARD_VALVE_CVS[STANDARD_VALVE_CVS.length - 1];

  const Pv = 0.023;
  const Fl = params.allowedPressureRecovery ?? 0.9;
  const cavitationIndex =
    (params.inletPressureBar - params.outletPressureBar) / (params.inletPressureBar - Pv);

  const cavitationThreshold = Fl ** 2;
  const cavitationWarning =
    cavitationIndex > cavitationThreshold
      ? `Warning: Cavitation likely (sigma=${cavitationIndex.toFixed(2)} > ${cavitationThreshold.toFixed(2)}). Consider trim selection or multiple valves.`
      : null;

  return {
    requiredCv: Math.round(requiredCv * 10) / 10,
    flowRateGpm: Math.round(flowGpm * 10) / 10,
    pressureDropPsi: Math.round(pressureDropPsi * 10) / 10,
    recommendedValveSize: recommendedValve.size,
    cavitationIndex: Math.round(cavitationIndex * 100) / 100,
    cavitationWarning,
  };
};

// ============================================
// PUMP AFFINITY LAWS
// ============================================

export interface AffinityLawsResult {
  newFlowM3h: number;
  newHeadM: number;
  newPowerKw: number;
  speedRatio: number;
  diameterRatio: number;
}

export const calculateAffinityLawsSpeed = (
  originalFlowM3h: number,
  originalHeadM: number,
  originalPowerKw: number,
  originalSpeedRpm: number,
  newSpeedRpm: number,
): AffinityLawsResult => {
  const speedRatio = newSpeedRpm / originalSpeedRpm;

  return {
    newFlowM3h: Math.round(originalFlowM3h * speedRatio * 100) / 100,
    newHeadM: Math.round(originalHeadM * speedRatio ** 2 * 100) / 100,
    newPowerKw: Math.round(originalPowerKw * speedRatio ** 3 * 100) / 100,
    speedRatio: Math.round(speedRatio * 1000) / 1000,
    diameterRatio: 1,
  };
};

export const calculateAffinityLawsDiameter = (
  originalFlowM3h: number,
  originalHeadM: number,
  originalPowerKw: number,
  originalDiameterMm: number,
  newDiameterMm: number,
): AffinityLawsResult => {
  const diameterRatio = newDiameterMm / originalDiameterMm;

  return {
    newFlowM3h: Math.round(originalFlowM3h * diameterRatio * 100) / 100,
    newHeadM: Math.round(originalHeadM * diameterRatio ** 2 * 100) / 100,
    newPowerKw: Math.round(originalPowerKw * diameterRatio ** 3 * 100) / 100,
    speedRatio: 1,
    diameterRatio: Math.round(diameterRatio * 1000) / 1000,
  };
};

// ============================================
// SYSTEM CURVE CALCULATIONS
// ============================================

export interface SystemCurveParams {
  staticHeadM: number;
  frictionLossAtDesignFlowM: number;
  designFlowM3h: number;
}

export interface SystemCurvePoint {
  flowM3h: number;
  headM: number;
}

export const calculateSystemCurve = (
  params: SystemCurveParams,
  flowPointsCount: number = 10,
): SystemCurvePoint[] => {
  const maxFlow = params.designFlowM3h * 1.5;
  const flowStep = maxFlow / flowPointsCount;

  const K = params.frictionLossAtDesignFlowM / params.designFlowM3h ** 2;

  return Array.from({ length: flowPointsCount + 1 }, (_, i) => {
    const flow = i * flowStep;
    const frictionHead = K * flow ** 2;
    return {
      flowM3h: Math.round(flow * 100) / 100,
      headM: Math.round((params.staticHeadM + frictionHead) * 100) / 100,
    };
  });
};

export const findOperatingPoint = (
  pumpCurve: PumpCurvePoint[],
  systemCurve: SystemCurvePoint[],
): { flowM3h: number; headM: number; efficiencyPercent?: number } | null => {
  const sortedPumpCurve = [...pumpCurve].sort((a, b) => a.flowM3h - b.flowM3h);

  const pumpSegments = sortedPumpCurve.slice(0, -1).map((p1, i) => ({
    p1,
    p2: sortedPumpCurve[i + 1],
  }));

  const operatingPoints = pumpSegments.flatMap(({ p1, p2 }) => {
    const matchingSystemPoints = systemCurve.filter(
      (s) => s.flowM3h >= p1.flowM3h && s.flowM3h <= p2.flowM3h,
    );

    return matchingSystemPoints
      .map((sysPoint) => {
        const ratio = (sysPoint.flowM3h - p1.flowM3h) / (p2.flowM3h - p1.flowM3h);
        const interpolatedPumpHead = p1.headM + ratio * (p2.headM - p1.headM);

        if (Math.abs(interpolatedPumpHead - sysPoint.headM) < 0.5) {
          const efficiency =
            p1.efficiencyPercent && p2.efficiencyPercent
              ? p1.efficiencyPercent + ratio * (p2.efficiencyPercent - p1.efficiencyPercent)
              : undefined;

          return {
            flowM3h: Math.round(sysPoint.flowM3h * 100) / 100,
            headM: Math.round(interpolatedPumpHead * 100) / 100,
            efficiencyPercent: efficiency ? Math.round(efficiency * 10) / 10 : undefined,
          };
        }
        return null;
      })
      .filter((point): point is NonNullable<typeof point> => point !== null);
  });

  return operatingPoints.length > 0 ? operatingPoints[0] : null;
};

// ============================================
// SPECIFIC SPEED CALCULATIONS
// ============================================

export const calculateSpecificSpeedMetric = (
  flowM3h: number,
  headM: number,
  speedRpm: number,
): number => {
  const flowM3s = flowM3h / 3600;
  return (speedRpm * Math.sqrt(flowM3s)) / headM ** 0.75;
};

export const calculateSpecificSpeedUS = (
  flowGpm: number,
  headFt: number,
  speedRpm: number,
): number => {
  return (speedRpm * Math.sqrt(flowGpm)) / headFt ** 0.75;
};

export type PumpTypeByNs = "radial_low_ns" | "radial_medium_ns" | "mixed_flow" | "axial_flow";

export const getPumpTypeBySpecificSpeed = (
  nsMetric: number,
): {
  type: PumpTypeByNs;
  description: string;
  typicalEfficiency: string;
} => {
  if (nsMetric < 25) {
    return {
      type: "radial_low_ns",
      description: "Radial flow - Low specific speed",
      typicalEfficiency: "60-75%",
    };
  }
  if (nsMetric < 70) {
    return {
      type: "radial_medium_ns",
      description: "Radial flow - Medium specific speed (most common)",
      typicalEfficiency: "75-85%",
    };
  }
  if (nsMetric < 160) {
    return {
      type: "mixed_flow",
      description: "Mixed flow pump",
      typicalEfficiency: "80-88%",
    };
  }
  return {
    type: "axial_flow",
    description: "Axial flow pump",
    typicalEfficiency: "85-92%",
  };
};

// ============================================
// PUMP SIZING SUMMARY CALCULATOR
// ============================================

export interface PumpSizingInput {
  flowRateM3h: number;
  totalHeadM: number;
  specificGravity?: number;
  viscosityCp?: number;
  operatingTempC?: number;
  speedRpm?: number;
  npshAvailableM?: number;
}

export interface PumpSizingSummary {
  hydraulicPowerKw: number;
  estimatedShaftPowerKw: number;
  recommendedMotorKw: number;
  specificSpeedMetric: number;
  pumpTypeRecommendation: string;
  estimatedEfficiency: string;
  npshMarginStatus: string | null;
  viscosityCorrection: string | null;
  flowRangeRecommendation: string;
}

export const calculatePumpSizingSummary = (input: PumpSizingInput): PumpSizingSummary => {
  const sg = input.specificGravity ?? 1.0;
  const speedRpm = input.speedRpm ?? 1450;

  const hydraulicPowerKw = calculateHydraulicPower(input.flowRateM3h, input.totalHeadM, sg);

  const nsMetric = calculateSpecificSpeedMetric(input.flowRateM3h, input.totalHeadM, speedRpm);
  const pumpTypeInfo = getPumpTypeBySpecificSpeed(nsMetric);

  const effRange = pumpTypeInfo.typicalEfficiency.split("-").map((s) => parseFloat(s));
  const estimatedEfficiency = (effRange[0] + effRange[1]) / 2;

  const shaftPowerKw = calculateShaftPower(hydraulicPowerKw, estimatedEfficiency);
  const motorPowerRequired = calculateMotorPower(shaftPowerKw);
  const recommendedMotorKw = selectNextMotorSize(motorPowerRequired);

  let npshMarginStatus: string | null = null;
  if (input.npshAvailableM !== undefined) {
    const estimatedNpshR = 2 + input.flowRateM3h / 100;
    const margin = input.npshAvailableM - estimatedNpshR;
    npshMarginStatus =
      margin >= 1.0
        ? `OK - NPSHa ${input.npshAvailableM}m > NPSHr ~${estimatedNpshR.toFixed(1)}m (margin: ${margin.toFixed(1)}m)`
        : margin >= 0
          ? `Marginal - NPSHa ${input.npshAvailableM}m ~ NPSHr ~${estimatedNpshR.toFixed(1)}m`
          : `Warning - NPSHa ${input.npshAvailableM}m < NPSHr ~${estimatedNpshR.toFixed(1)}m - cavitation risk`;
  }

  let viscosityCorrection: string | null = null;
  if (input.viscosityCp !== undefined && input.viscosityCp > 10) {
    if (input.viscosityCp > 500) {
      viscosityCorrection = `High viscosity (${input.viscosityCp} cP) - Consider positive displacement pump`;
    } else if (input.viscosityCp > 100) {
      viscosityCorrection = `Elevated viscosity (${input.viscosityCp} cP) - Apply HI viscosity correction factors`;
    } else {
      viscosityCorrection = `Moderate viscosity (${input.viscosityCp} cP) - Minor efficiency reduction expected`;
    }
  }

  const minFlow = input.flowRateM3h * 0.6;
  const maxFlow = input.flowRateM3h * 1.2;

  return {
    hydraulicPowerKw: Math.round(hydraulicPowerKw * 100) / 100,
    estimatedShaftPowerKw: Math.round(shaftPowerKw * 100) / 100,
    recommendedMotorKw,
    specificSpeedMetric: Math.round(nsMetric * 10) / 10,
    pumpTypeRecommendation: pumpTypeInfo.description,
    estimatedEfficiency: pumpTypeInfo.typicalEfficiency,
    npshMarginStatus,
    viscosityCorrection,
    flowRangeRecommendation: `Continuous operation: ${Math.round(minFlow)}-${Math.round(maxFlow)} m³/h`,
  };
};
