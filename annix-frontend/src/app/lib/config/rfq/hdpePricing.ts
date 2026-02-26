import type { HdpeNominalSize, PipeDimensionResult } from "./hdpeDimensions";
import { pipeDimensions } from "./hdpeDimensions";
import type { HdpeGradeCode } from "./hdpeGrades";
import type { SdrValue } from "./hdpeSdrRatings";
import type { HdpeWeldingMethod } from "./hdpeWelding";

export type StandardPipeLength = 6 | 12 | 13.7 | 18;

export interface HdpePipeLengthInfo {
  lengthM: number;
  description: string;
  coilAvailable: boolean;
  maxCoilDnMm: number;
}

export const HDPE_STANDARD_PIPE_LENGTHS: HdpePipeLengthInfo[] = [
  { lengthM: 6, description: "Standard 6m straight length", coilAvailable: false, maxCoilDnMm: 0 },
  {
    lengthM: 12,
    description: "Standard 12m straight length",
    coilAvailable: false,
    maxCoilDnMm: 0,
  },
  {
    lengthM: 13.7,
    description: "45ft container length",
    coilAvailable: false,
    maxCoilDnMm: 0,
  },
  {
    lengthM: 18,
    description: "Standard 18m straight length",
    coilAvailable: false,
    maxCoilDnMm: 0,
  },
];

export const HDPE_COIL_SIZES: { maxDnMm: number; maxLengthM: number }[] = [
  { maxDnMm: 63, maxLengthM: 100 },
  { maxDnMm: 110, maxLengthM: 50 },
  { maxDnMm: 160, maxLengthM: 25 },
];

export interface JointCountResult {
  pipeLengthsNeeded: number;
  standardLengthM: number;
  jointCount: number;
  wasteM: number;
  wastePct: number;
}

export const calculateJointCount = (
  totalLengthM: number,
  standardLengthM: StandardPipeLength = 12,
): JointCountResult => {
  if (totalLengthM <= 0) {
    return {
      pipeLengthsNeeded: 0,
      standardLengthM,
      jointCount: 0,
      wasteM: 0,
      wastePct: 0,
    };
  }

  const pipeLengthsNeeded = Math.ceil(totalLengthM / standardLengthM);
  const jointCount = pipeLengthsNeeded > 0 ? pipeLengthsNeeded - 1 : 0;
  const actualLengthM = pipeLengthsNeeded * standardLengthM;
  const wasteM = actualLengthM - totalLengthM;
  const wastePct = totalLengthM > 0 ? (wasteM / actualLengthM) * 100 : 0;

  return {
    pipeLengthsNeeded,
    standardLengthM,
    jointCount,
    wasteM: Math.round(wasteM * 100) / 100,
    wastePct: Math.round(wastePct * 10) / 10,
  };
};

export const canUseCoil = (dnMm: HdpeNominalSize, totalLengthM: number): boolean => {
  const coilSpec = HDPE_COIL_SIZES.find((c) => dnMm <= c.maxDnMm);
  if (!coilSpec) {
    return false;
  }
  return totalLengthM <= coilSpec.maxLengthM;
};

export const optimalPipeConfiguration = (
  dnMm: HdpeNominalSize,
  totalLengthM: number,
): { useCoil: boolean; jointCount: number; standardLengthM: number | null; wasteM: number } => {
  if (canUseCoil(dnMm, totalLengthM)) {
    return {
      useCoil: true,
      jointCount: 0,
      standardLengthM: null,
      wasteM: 0,
    };
  }

  const options = HDPE_STANDARD_PIPE_LENGTHS.map((spec) =>
    calculateJointCount(totalLengthM, spec.lengthM as StandardPipeLength),
  );

  const optimal = options.reduce((best, current) =>
    current.jointCount < best.jointCount ||
    (current.jointCount === best.jointCount && current.wasteM < best.wasteM)
      ? current
      : best,
  );

  return {
    useCoil: false,
    jointCount: optimal.jointCount,
    standardLengthM: optimal.standardLengthM,
    wasteM: optimal.wasteM,
  };
};

export interface ButtFusionCostFactors {
  laborRatePerHour: number;
  cycleTimeMin: number;
  setupTimeMin: number;
  consumablesPerJoint: number;
}

export const BUTT_FUSION_COST_FACTORS: Record<string, ButtFusionCostFactors> = {
  small: {
    laborRatePerHour: 350,
    cycleTimeMin: 25,
    setupTimeMin: 10,
    consumablesPerJoint: 15,
  },
  medium: {
    laborRatePerHour: 450,
    cycleTimeMin: 45,
    setupTimeMin: 15,
    consumablesPerJoint: 35,
  },
  large: {
    laborRatePerHour: 550,
    cycleTimeMin: 75,
    setupTimeMin: 20,
    consumablesPerJoint: 65,
  },
};

const buttFusionSizeCategory = (dnMm: number): "small" | "medium" | "large" => {
  if (dnMm <= 160) {
    return "small";
  }
  if (dnMm <= 315) {
    return "medium";
  }
  return "large";
};

export interface FusionMachineRental {
  sizeRange: string;
  minDnMm: number;
  maxDnMm: number;
  dailyRate: number;
  weeklyRate: number;
  monthlyRate: number;
  operatorRequired: boolean;
}

export const FUSION_MACHINE_RENTALS: FusionMachineRental[] = [
  {
    sizeRange: "63-160mm",
    minDnMm: 63,
    maxDnMm: 160,
    dailyRate: 1500,
    weeklyRate: 6000,
    monthlyRate: 18000,
    operatorRequired: false,
  },
  {
    sizeRange: "90-315mm",
    minDnMm: 90,
    maxDnMm: 315,
    dailyRate: 2500,
    weeklyRate: 10000,
    monthlyRate: 30000,
    operatorRequired: false,
  },
  {
    sizeRange: "160-500mm",
    minDnMm: 160,
    maxDnMm: 500,
    dailyRate: 4500,
    weeklyRate: 18000,
    monthlyRate: 54000,
    operatorRequired: true,
  },
  {
    sizeRange: "315-630mm",
    minDnMm: 315,
    maxDnMm: 630,
    dailyRate: 7500,
    weeklyRate: 30000,
    monthlyRate: 90000,
    operatorRequired: true,
  },
  {
    sizeRange: "500-1200mm",
    minDnMm: 500,
    maxDnMm: 1200,
    dailyRate: 12000,
    weeklyRate: 48000,
    monthlyRate: 144000,
    operatorRequired: true,
  },
];

export const fusionMachineForSize = (dnMm: number): FusionMachineRental | null => {
  return FUSION_MACHINE_RENTALS.find((m) => dnMm >= m.minDnMm && dnMm <= m.maxDnMm) ?? null;
};

export interface ElectrofusionCouplerCost {
  dnMm: number;
  couplerPrice: number;
  reducerPrice: number | null;
  fusionTimeMin: number;
}

export const ELECTROFUSION_COUPLER_COSTS: ElectrofusionCouplerCost[] = [
  { dnMm: 20, couplerPrice: 45, reducerPrice: null, fusionTimeMin: 2 },
  { dnMm: 25, couplerPrice: 52, reducerPrice: 65, fusionTimeMin: 2 },
  { dnMm: 32, couplerPrice: 65, reducerPrice: 78, fusionTimeMin: 3 },
  { dnMm: 40, couplerPrice: 85, reducerPrice: 98, fusionTimeMin: 3 },
  { dnMm: 50, couplerPrice: 110, reducerPrice: 125, fusionTimeMin: 4 },
  { dnMm: 63, couplerPrice: 145, reducerPrice: 165, fusionTimeMin: 5 },
  { dnMm: 75, couplerPrice: 185, reducerPrice: 210, fusionTimeMin: 6 },
  { dnMm: 90, couplerPrice: 235, reducerPrice: 265, fusionTimeMin: 7 },
  { dnMm: 110, couplerPrice: 320, reducerPrice: 365, fusionTimeMin: 8 },
  { dnMm: 125, couplerPrice: 395, reducerPrice: 450, fusionTimeMin: 9 },
  { dnMm: 140, couplerPrice: 475, reducerPrice: 540, fusionTimeMin: 10 },
  { dnMm: 160, couplerPrice: 580, reducerPrice: 660, fusionTimeMin: 12 },
  { dnMm: 180, couplerPrice: 720, reducerPrice: 820, fusionTimeMin: 14 },
  { dnMm: 200, couplerPrice: 880, reducerPrice: 1000, fusionTimeMin: 16 },
  { dnMm: 225, couplerPrice: 1100, reducerPrice: 1250, fusionTimeMin: 18 },
  { dnMm: 250, couplerPrice: 1350, reducerPrice: 1540, fusionTimeMin: 20 },
  { dnMm: 280, couplerPrice: 1680, reducerPrice: 1920, fusionTimeMin: 24 },
  { dnMm: 315, couplerPrice: 2100, reducerPrice: 2400, fusionTimeMin: 28 },
  { dnMm: 355, couplerPrice: 2650, reducerPrice: 3020, fusionTimeMin: 32 },
  { dnMm: 400, couplerPrice: 3350, reducerPrice: 3820, fusionTimeMin: 38 },
  { dnMm: 450, couplerPrice: 4200, reducerPrice: 4790, fusionTimeMin: 44 },
  { dnMm: 500, couplerPrice: 5250, reducerPrice: 5990, fusionTimeMin: 52 },
  { dnMm: 560, couplerPrice: 6580, reducerPrice: 7510, fusionTimeMin: 60 },
  { dnMm: 630, couplerPrice: 8350, reducerPrice: 9530, fusionTimeMin: 70 },
];

export const electrofusionCouplerCost = (dnMm: number): ElectrofusionCouplerCost | null => {
  const exact = ELECTROFUSION_COUPLER_COSTS.find((c) => c.dnMm === dnMm);
  if (exact) {
    return exact;
  }

  const sorted = [...ELECTROFUSION_COUPLER_COSTS].sort((a, b) => a.dnMm - b.dnMm);
  const nextLarger = sorted.find((c) => c.dnMm > dnMm);

  return nextLarger ?? sorted[sorted.length - 1];
};

export interface ElectrofusionEquipmentRental {
  name: string;
  dailyRate: number;
  weeklyRate: number;
  includesScraperClamps: boolean;
}

export const ELECTROFUSION_EQUIPMENT: ElectrofusionEquipmentRental = {
  name: "Electrofusion Control Unit",
  dailyRate: 800,
  weeklyRate: 3200,
  includesScraperClamps: true,
};

export interface JointCostBreakdown {
  method: HdpeWeldingMethod;
  laborCost: number;
  consumablesCost: number;
  fittingCost: number;
  totalPerJoint: number;
}

export const buttFusionJointCost = (
  dnMm: number,
  laborRateOverride?: number,
): JointCostBreakdown => {
  const category = buttFusionSizeCategory(dnMm);
  const factors = BUTT_FUSION_COST_FACTORS[category];
  const laborRate = laborRateOverride ?? factors.laborRatePerHour;
  const cycleHours = (factors.cycleTimeMin + factors.setupTimeMin) / 60;
  const laborCost = Math.round(cycleHours * laborRate * 100) / 100;

  return {
    method: "butt_fusion",
    laborCost,
    consumablesCost: factors.consumablesPerJoint,
    fittingCost: 0,
    totalPerJoint: Math.round((laborCost + factors.consumablesPerJoint) * 100) / 100,
  };
};

export const electrofusionJointCost = (
  dnMm: number,
  laborRatePerHour: number = 350,
): JointCostBreakdown => {
  const couplerData = electrofusionCouplerCost(dnMm);
  const fittingCost = couplerData?.couplerPrice ?? 0;
  const fusionTimeMin = couplerData?.fusionTimeMin ?? 10;
  const prepTimeMin = 5;
  const totalTimeHours = (fusionTimeMin + prepTimeMin) / 60;
  const laborCost = Math.round(totalTimeHours * laborRatePerHour * 100) / 100;

  return {
    method: "electrofusion",
    laborCost,
    consumablesCost: 10,
    fittingCost,
    totalPerJoint: Math.round((laborCost + 10 + fittingCost) * 100) / 100,
  };
};

export interface HdpeMaterialCostResult {
  dims: PipeDimensionResult;
  totalWeightKg: number;
  materialCostPerKg: number;
  totalMaterialCost: number;
}

export const calculateHdpeMaterialCost = (
  dnMm: HdpeNominalSize,
  sdr: SdrValue,
  lengthM: number,
  pricePerKg: number,
  gradeCode: HdpeGradeCode = "PE100",
): HdpeMaterialCostResult => {
  const dims = pipeDimensions(dnMm, sdr, gradeCode);
  const totalWeightKg = Math.round(dims.weightKgM * lengthM * 100) / 100;
  const totalMaterialCost = Math.round(totalWeightKg * pricePerKg * 100) / 100;

  return {
    dims,
    totalWeightKg,
    materialCostPerKg: pricePerKg,
    totalMaterialCost,
  };
};

export interface HdpePipeCostEstimate {
  material: HdpeMaterialCostResult;
  joints: {
    method: HdpeWeldingMethod;
    jointCount: number;
    costPerJoint: JointCostBreakdown;
    totalJointCost: number;
  };
  configuration: {
    useCoil: boolean;
    standardLengthM: number | null;
    wasteM: number;
  };
  machineRental: FusionMachineRental | null;
  totalCost: number;
}

export const estimateHdpePipeCost = (
  dnMm: HdpeNominalSize,
  sdr: SdrValue,
  totalLengthM: number,
  pricePerKg: number,
  weldingMethod: HdpeWeldingMethod = "butt_fusion",
  gradeCode: HdpeGradeCode = "PE100",
): HdpePipeCostEstimate => {
  const material = calculateHdpeMaterialCost(dnMm, sdr, totalLengthM, pricePerKg, gradeCode);
  const config = optimalPipeConfiguration(dnMm, totalLengthM);

  const costPerJoint =
    weldingMethod === "electrofusion" ? electrofusionJointCost(dnMm) : buttFusionJointCost(dnMm);

  const totalJointCost = Math.round(config.jointCount * costPerJoint.totalPerJoint * 100) / 100;
  const machineRental =
    weldingMethod === "butt_fusion" && config.jointCount > 0 ? fusionMachineForSize(dnMm) : null;

  const totalCost = Math.round((material.totalMaterialCost + totalJointCost) * 100) / 100;

  return {
    material,
    joints: {
      method: weldingMethod,
      jointCount: config.jointCount,
      costPerJoint,
      totalJointCost,
    },
    configuration: {
      useCoil: config.useCoil,
      standardLengthM: config.standardLengthM,
      wasteM: config.wasteM,
    },
    machineRental,
    totalCost,
  };
};

export interface HdpeFittingCostEstimate {
  fittingType: string;
  materialWeightKg: number;
  materialCost: number;
  weldingMethod: HdpeWeldingMethod;
  jointCount: number;
  jointCost: JointCostBreakdown;
  totalJointCost: number;
  totalCost: number;
}

export const estimateHdpeFittingCost = (
  fittingType: string,
  dnMm: HdpeNominalSize,
  weightKg: number,
  pricePerKg: number,
  jointCount: number,
  weldingMethod: HdpeWeldingMethod = "butt_fusion",
): HdpeFittingCostEstimate => {
  const materialCost = Math.round(weightKg * pricePerKg * 100) / 100;

  const jointCost =
    weldingMethod === "electrofusion" ? electrofusionJointCost(dnMm) : buttFusionJointCost(dnMm);

  const totalJointCost = Math.round(jointCount * jointCost.totalPerJoint * 100) / 100;
  const totalCost = Math.round((materialCost + totalJointCost) * 100) / 100;

  return {
    fittingType,
    materialWeightKg: weightKg,
    materialCost,
    weldingMethod,
    jointCount,
    jointCost,
    totalJointCost,
    totalCost,
  };
};

export const estimateMachineRentalDays = (jointCount: number, jointsPerDay: number = 8): number => {
  if (jointCount <= 0) {
    return 0;
  }
  return Math.ceil(jointCount / jointsPerDay);
};

export const machineRentalCost = (
  dnMm: number,
  jointCount: number,
  jointsPerDay: number = 8,
): { machine: FusionMachineRental | null; days: number; cost: number } => {
  const machine = fusionMachineForSize(dnMm);
  if (!machine || jointCount <= 0) {
    return { machine: null, days: 0, cost: 0 };
  }

  const days = estimateMachineRentalDays(jointCount, jointsPerDay);

  let cost: number;
  if (days <= 1) {
    cost = machine.dailyRate;
  } else if (days <= 7) {
    cost = Math.min(days * machine.dailyRate, machine.weeklyRate);
  } else {
    const weeks = Math.floor(days / 7);
    const extraDays = days % 7;
    cost = weeks * machine.weeklyRate + Math.min(extraDays * machine.dailyRate, machine.weeklyRate);
  }

  return { machine, days, cost: Math.round(cost * 100) / 100 };
};
