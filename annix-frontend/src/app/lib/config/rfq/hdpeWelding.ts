export type HdpeWeldingMethod =
  | "butt_fusion"
  | "electrofusion"
  | "extrusion"
  | "hot_gas"
  | "mechanical";

export interface WeldingMethodInfo {
  method: HdpeWeldingMethod;
  name: string;
  description: string;
  minPipeDnMm: number;
  maxPipeDnMm: number | null;
  pressureRated: boolean;
  fieldWeldable: boolean;
  equipmentRequired: string[];
  qualificationStandard: string;
}

export const HDPE_WELDING_METHODS: Record<HdpeWeldingMethod, WeldingMethodInfo> = {
  butt_fusion: {
    method: "butt_fusion",
    name: "Butt Fusion",
    description: "Heat pipe ends to melting point, press together under controlled pressure",
    minPipeDnMm: 63,
    maxPipeDnMm: null,
    pressureRated: true,
    fieldWeldable: true,
    equipmentRequired: ["Butt fusion machine", "Facing tool", "Heater plate", "Clamps"],
    qualificationStandard: "DVS 2210-1",
  },
  electrofusion: {
    method: "electrofusion",
    name: "Electrofusion",
    description: "Fitting with embedded heating coils melts pipe/fitting interface",
    minPipeDnMm: 20,
    maxPipeDnMm: 630,
    pressureRated: true,
    fieldWeldable: true,
    equipmentRequired: ["Electrofusion control unit", "Pipe scraper", "Pipe clamps"],
    qualificationStandard: "DVS 2210-1",
  },
  extrusion: {
    method: "extrusion",
    name: "Extrusion Welding",
    description: "Molten HDPE rod extruded onto preheated surface for fabrication/repairs",
    minPipeDnMm: 90,
    maxPipeDnMm: null,
    pressureRated: false,
    fieldWeldable: true,
    equipmentRequired: ["Extrusion welder", "Hot air gun", "Welding rod"],
    qualificationStandard: "DVS 2212-1",
  },
  hot_gas: {
    method: "hot_gas",
    name: "Hot Gas Welding",
    description: "Manual welding with hot air and filler rod for small fittings/repairs",
    minPipeDnMm: 20,
    maxPipeDnMm: 63,
    pressureRated: false,
    fieldWeldable: true,
    equipmentRequired: ["Hot air welder", "Welding rod", "Speed tip"],
    qualificationStandard: "DVS 2212-1",
  },
  mechanical: {
    method: "mechanical",
    name: "Mechanical Connection",
    description: "Flanges, compression fittings, or MJ adapters for transitions",
    minPipeDnMm: 20,
    maxPipeDnMm: null,
    pressureRated: true,
    fieldWeldable: true,
    equipmentRequired: ["Torque wrench", "Flange bolts"],
    qualificationStandard: "N/A",
  },
};

export interface ButtFusionParameters {
  dnMm: number;
  wallMm: number;
  beadUpPressureNMm2: number;
  dragPressureNMm2: number;
  heatingTimeSec: { min: number; max: number };
  changeoverTimeSec: number;
  fusionPressureNMm2: number;
  coolingTimeMin: number;
  heatPlateTemperatureC: { min: number; max: number };
  beadSizeMm: { min: number; max: number };
  misalignmentTolerancePct: number;
}

export const BUTT_FUSION_PARAMETERS: ButtFusionParameters[] = [
  {
    dnMm: 63,
    wallMm: 5.8,
    beadUpPressureNMm2: 0.15,
    dragPressureNMm2: 0.02,
    heatingTimeSec: { min: 70, max: 85 },
    changeoverTimeSec: 4,
    fusionPressureNMm2: 0.15,
    coolingTimeMin: 10,
    heatPlateTemperatureC: { min: 200, max: 230 },
    beadSizeMm: { min: 1.5, max: 3.0 },
    misalignmentTolerancePct: 10,
  },
  {
    dnMm: 75,
    wallMm: 6.8,
    beadUpPressureNMm2: 0.15,
    dragPressureNMm2: 0.02,
    heatingTimeSec: { min: 82, max: 100 },
    changeoverTimeSec: 4,
    fusionPressureNMm2: 0.15,
    coolingTimeMin: 12,
    heatPlateTemperatureC: { min: 200, max: 230 },
    beadSizeMm: { min: 1.5, max: 3.5 },
    misalignmentTolerancePct: 10,
  },
  {
    dnMm: 90,
    wallMm: 8.2,
    beadUpPressureNMm2: 0.15,
    dragPressureNMm2: 0.02,
    heatingTimeSec: { min: 99, max: 120 },
    changeoverTimeSec: 5,
    fusionPressureNMm2: 0.15,
    coolingTimeMin: 14,
    heatPlateTemperatureC: { min: 200, max: 230 },
    beadSizeMm: { min: 2.0, max: 4.0 },
    misalignmentTolerancePct: 10,
  },
  {
    dnMm: 110,
    wallMm: 10.0,
    beadUpPressureNMm2: 0.15,
    dragPressureNMm2: 0.02,
    heatingTimeSec: { min: 140, max: 170 },
    changeoverTimeSec: 5,
    fusionPressureNMm2: 0.15,
    coolingTimeMin: 20,
    heatPlateTemperatureC: { min: 200, max: 230 },
    beadSizeMm: { min: 2.0, max: 4.0 },
    misalignmentTolerancePct: 10,
  },
  {
    dnMm: 125,
    wallMm: 11.4,
    beadUpPressureNMm2: 0.15,
    dragPressureNMm2: 0.02,
    heatingTimeSec: { min: 160, max: 195 },
    changeoverTimeSec: 6,
    fusionPressureNMm2: 0.15,
    coolingTimeMin: 22,
    heatPlateTemperatureC: { min: 200, max: 230 },
    beadSizeMm: { min: 2.0, max: 4.0 },
    misalignmentTolerancePct: 10,
  },
  {
    dnMm: 160,
    wallMm: 14.6,
    beadUpPressureNMm2: 0.15,
    dragPressureNMm2: 0.02,
    heatingTimeSec: { min: 205, max: 250 },
    changeoverTimeSec: 7,
    fusionPressureNMm2: 0.15,
    coolingTimeMin: 28,
    heatPlateTemperatureC: { min: 200, max: 230 },
    beadSizeMm: { min: 2.5, max: 4.5 },
    misalignmentTolerancePct: 10,
  },
  {
    dnMm: 200,
    wallMm: 18.2,
    beadUpPressureNMm2: 0.15,
    dragPressureNMm2: 0.02,
    heatingTimeSec: { min: 255, max: 310 },
    changeoverTimeSec: 8,
    fusionPressureNMm2: 0.15,
    coolingTimeMin: 34,
    heatPlateTemperatureC: { min: 200, max: 230 },
    beadSizeMm: { min: 3.0, max: 5.0 },
    misalignmentTolerancePct: 10,
  },
  {
    dnMm: 250,
    wallMm: 22.7,
    beadUpPressureNMm2: 0.15,
    dragPressureNMm2: 0.02,
    heatingTimeSec: { min: 320, max: 390 },
    changeoverTimeSec: 9,
    fusionPressureNMm2: 0.18,
    coolingTimeMin: 42,
    heatPlateTemperatureC: { min: 200, max: 230 },
    beadSizeMm: { min: 3.5, max: 5.5 },
    misalignmentTolerancePct: 10,
  },
  {
    dnMm: 315,
    wallMm: 28.6,
    beadUpPressureNMm2: 0.15,
    dragPressureNMm2: 0.02,
    heatingTimeSec: { min: 380, max: 450 },
    changeoverTimeSec: 10,
    fusionPressureNMm2: 0.2,
    coolingTimeMin: 45,
    heatPlateTemperatureC: { min: 200, max: 230 },
    beadSizeMm: { min: 4.0, max: 6.0 },
    misalignmentTolerancePct: 10,
  },
  {
    dnMm: 355,
    wallMm: 32.3,
    beadUpPressureNMm2: 0.15,
    dragPressureNMm2: 0.02,
    heatingTimeSec: { min: 430, max: 520 },
    changeoverTimeSec: 12,
    fusionPressureNMm2: 0.2,
    coolingTimeMin: 52,
    heatPlateTemperatureC: { min: 200, max: 230 },
    beadSizeMm: { min: 4.0, max: 6.5 },
    misalignmentTolerancePct: 10,
  },
  {
    dnMm: 400,
    wallMm: 36.4,
    beadUpPressureNMm2: 0.15,
    dragPressureNMm2: 0.02,
    heatingTimeSec: { min: 510, max: 620 },
    changeoverTimeSec: 14,
    fusionPressureNMm2: 0.22,
    coolingTimeMin: 60,
    heatPlateTemperatureC: { min: 200, max: 230 },
    beadSizeMm: { min: 4.5, max: 7.0 },
    misalignmentTolerancePct: 10,
  },
  {
    dnMm: 450,
    wallMm: 40.9,
    beadUpPressureNMm2: 0.15,
    dragPressureNMm2: 0.02,
    heatingTimeSec: { min: 575, max: 700 },
    changeoverTimeSec: 16,
    fusionPressureNMm2: 0.22,
    coolingTimeMin: 68,
    heatPlateTemperatureC: { min: 200, max: 230 },
    beadSizeMm: { min: 5.0, max: 7.5 },
    misalignmentTolerancePct: 10,
  },
  {
    dnMm: 500,
    wallMm: 45.5,
    beadUpPressureNMm2: 0.15,
    dragPressureNMm2: 0.02,
    heatingTimeSec: { min: 640, max: 780 },
    changeoverTimeSec: 17,
    fusionPressureNMm2: 0.22,
    coolingTimeMin: 75,
    heatPlateTemperatureC: { min: 200, max: 230 },
    beadSizeMm: { min: 5.0, max: 8.0 },
    misalignmentTolerancePct: 10,
  },
  {
    dnMm: 560,
    wallMm: 50.9,
    beadUpPressureNMm2: 0.15,
    dragPressureNMm2: 0.02,
    heatingTimeSec: { min: 715, max: 870 },
    changeoverTimeSec: 18,
    fusionPressureNMm2: 0.24,
    coolingTimeMin: 82,
    heatPlateTemperatureC: { min: 200, max: 230 },
    beadSizeMm: { min: 5.5, max: 8.5 },
    misalignmentTolerancePct: 10,
  },
  {
    dnMm: 630,
    wallMm: 57.3,
    beadUpPressureNMm2: 0.15,
    dragPressureNMm2: 0.02,
    heatingTimeSec: { min: 900, max: 1100 },
    changeoverTimeSec: 20,
    fusionPressureNMm2: 0.25,
    coolingTimeMin: 90,
    heatPlateTemperatureC: { min: 200, max: 230 },
    beadSizeMm: { min: 6.0, max: 9.0 },
    misalignmentTolerancePct: 10,
  },
];

export interface ElectrofusionParameters {
  scrapeDepthMm: { min: number; max: number };
  fittingGapToleranceMm: number;
  coolingTimeMin: { min: number; max: number };
  ambientTempRangeC: { min: number; max: number };
  fusionVoltage: string;
}

export const ELECTROFUSION_PARAMETERS: ElectrofusionParameters = {
  scrapeDepthMm: { min: 0.5, max: 1.0 },
  fittingGapToleranceMm: 0.1,
  coolingTimeMin: { min: 20, max: 60 },
  ambientTempRangeC: { min: 5, max: 40 },
  fusionVoltage: "Barcode-specified (typically 39.5V)",
};

export interface ExtrusionWeldParameters {
  preheatAirTempC: { min: number; max: number };
  extrusionTempC: { min: number; max: number };
  grooveAngleDeg: number;
  rodDiameterMm: number[];
}

export const EXTRUSION_WELD_PARAMETERS: ExtrusionWeldParameters = {
  preheatAirTempC: { min: 300, max: 400 },
  extrusionTempC: { min: 200, max: 240 },
  grooveAngleDeg: 60,
  rodDiameterMm: [3, 4, 5],
};

export const buttFusionParametersForDn = (dnMm: number): ButtFusionParameters | null => {
  const exact = BUTT_FUSION_PARAMETERS.find((p) => p.dnMm === dnMm);
  if (exact) {
    return exact;
  }

  const sorted = [...BUTT_FUSION_PARAMETERS].sort((a, b) => a.dnMm - b.dnMm);

  if (dnMm < sorted[0].dnMm) {
    return null;
  }

  const largerIndex = sorted.findIndex((p) => p.dnMm > dnMm);
  if (largerIndex === -1) {
    return sorted[sorted.length - 1];
  }

  return sorted[largerIndex - 1];
};

export const estimateHeatingTime = (wallThicknessMm: number): { min: number; max: number } => {
  const baseTime = wallThicknessMm * 10;
  return {
    min: Math.round(baseTime),
    max: Math.round(baseTime * 1.2),
  };
};

export const estimateCoolingTime = (wallThicknessMm: number): number => {
  return Math.round(wallThicknessMm * 2);
};

export const maxChangeoverTime = (wallThicknessMm: number): number => {
  if (wallThicknessMm <= 4.5) return 4;
  if (wallThicknessMm <= 7) return 5;
  if (wallThicknessMm <= 12) return 6;
  if (wallThicknessMm <= 19) return 8;
  if (wallThicknessMm <= 26) return 10;
  if (wallThicknessMm <= 37) return 15;
  return 20;
};

export interface WeldingMethodSuitability {
  method: HdpeWeldingMethod;
  suitable: boolean;
  reason: string | null;
}

export const suitableWeldingMethods = (dnMm: number): WeldingMethodSuitability[] => {
  return Object.values(HDPE_WELDING_METHODS).map((info) => {
    const aboveMin = dnMm >= info.minPipeDnMm;
    const belowMax = info.maxPipeDnMm === null || dnMm <= info.maxPipeDnMm;
    const suitable = aboveMin && belowMax;

    let reason: string | null = null;
    if (!aboveMin) {
      reason = `Pipe DN ${dnMm}mm is below minimum ${info.minPipeDnMm}mm for ${info.name}`;
    } else if (!belowMax) {
      reason = `Pipe DN ${dnMm}mm exceeds maximum ${info.maxPipeDnMm}mm for ${info.name}`;
    }

    return {
      method: info.method,
      suitable,
      reason,
    };
  });
};

export const recommendedWeldingMethod = (
  dnMm: number,
  pressureService: boolean,
): HdpeWeldingMethod => {
  if (pressureService) {
    if (dnMm >= 63) {
      return "butt_fusion";
    }
    return "electrofusion";
  }
  if (dnMm < 63) {
    return "electrofusion";
  }
  return "butt_fusion";
};
