import type { SdrValue } from "./hdpeSdrRatings";
import type { HdpeWeldingMethod } from "./hdpeWelding";

export type HdpeFittingCategory = "butt_fusion" | "electrofusion" | "mechanical" | "flange";

export type ButtFusionFittingType =
  | "elbow_90"
  | "elbow_45"
  | "elbow_22_5"
  | "elbow_11_25"
  | "tee_equal"
  | "tee_reducing"
  | "reducer_concentric"
  | "reducer_eccentric"
  | "cap"
  | "stub_end"
  | "cross";

export type ElectrofusionFittingType =
  | "coupler"
  | "coupler_reducing"
  | "elbow_90"
  | "elbow_45"
  | "tee_equal"
  | "tee_reducing"
  | "saddle"
  | "tapping_tee"
  | "end_cap"
  | "transition";

export type MechanicalFittingType =
  | "flange_adapter"
  | "backing_ring"
  | "compression_coupling"
  | "repair_coupling"
  | "mj_adapter"
  | "transition_fitting"
  | "service_saddle";

export type HdpeFlangeType = "stub_end_flange" | "backing_flange" | "lap_joint" | "blind_flange";

export interface HdpeFitting {
  type: string;
  category: HdpeFittingCategory;
  name: string;
  description: string;
  weldingMethod: HdpeWeldingMethod;
  availableSdrValues: SdrValue[];
  minDnMm: number;
  maxDnMm: number;
  pressureRated: boolean;
  standards: string[];
}

export const BUTT_FUSION_FITTINGS: Record<ButtFusionFittingType, HdpeFitting> = {
  elbow_90: {
    type: "elbow_90",
    category: "butt_fusion",
    name: "90° Elbow",
    description: "Long radius 90-degree elbow for directional changes",
    weldingMethod: "butt_fusion",
    availableSdrValues: [11, 17, 21],
    minDnMm: 63,
    maxDnMm: 1200,
    pressureRated: true,
    standards: ["ASTM D3261", "ISO 4427-3", "EN 12201-3"],
  },
  elbow_45: {
    type: "elbow_45",
    category: "butt_fusion",
    name: "45° Elbow",
    description: "45-degree elbow for gradual directional changes",
    weldingMethod: "butt_fusion",
    availableSdrValues: [11, 17, 21],
    minDnMm: 63,
    maxDnMm: 1200,
    pressureRated: true,
    standards: ["ASTM D3261", "ISO 4427-3", "EN 12201-3"],
  },
  elbow_22_5: {
    type: "elbow_22_5",
    category: "butt_fusion",
    name: "22.5° Elbow",
    description: "22.5-degree elbow for minor directional changes",
    weldingMethod: "butt_fusion",
    availableSdrValues: [11, 17, 21],
    minDnMm: 90,
    maxDnMm: 630,
    pressureRated: true,
    standards: ["ASTM D3261", "ISO 4427-3"],
  },
  elbow_11_25: {
    type: "elbow_11_25",
    category: "butt_fusion",
    name: "11.25° Elbow",
    description: "11.25-degree elbow for slight directional changes",
    weldingMethod: "butt_fusion",
    availableSdrValues: [11, 17, 21],
    minDnMm: 90,
    maxDnMm: 630,
    pressureRated: true,
    standards: ["ASTM D3261", "ISO 4427-3"],
  },
  tee_equal: {
    type: "tee_equal",
    category: "butt_fusion",
    name: "Equal Tee",
    description: "Equal-outlet tee for branch connections",
    weldingMethod: "butt_fusion",
    availableSdrValues: [11, 17, 21],
    minDnMm: 63,
    maxDnMm: 630,
    pressureRated: true,
    standards: ["ASTM D3261", "ISO 4427-3", "EN 12201-3"],
  },
  tee_reducing: {
    type: "tee_reducing",
    category: "butt_fusion",
    name: "Reducing Tee",
    description: "Tee with reduced branch outlet",
    weldingMethod: "butt_fusion",
    availableSdrValues: [11, 17, 21],
    minDnMm: 63,
    maxDnMm: 630,
    pressureRated: true,
    standards: ["ASTM D3261", "ISO 4427-3", "EN 12201-3"],
  },
  reducer_concentric: {
    type: "reducer_concentric",
    category: "butt_fusion",
    name: "Concentric Reducer",
    description: "Centered reducer for pipe size transitions",
    weldingMethod: "butt_fusion",
    availableSdrValues: [11, 17, 21],
    minDnMm: 63,
    maxDnMm: 630,
    pressureRated: true,
    standards: ["ASTM D3261", "ISO 4427-3"],
  },
  reducer_eccentric: {
    type: "reducer_eccentric",
    category: "butt_fusion",
    name: "Eccentric Reducer",
    description: "Offset reducer maintaining one flat side",
    weldingMethod: "butt_fusion",
    availableSdrValues: [11, 17, 21],
    minDnMm: 63,
    maxDnMm: 630,
    pressureRated: true,
    standards: ["ASTM D3261", "ISO 4427-3"],
  },
  cap: {
    type: "cap",
    category: "butt_fusion",
    name: "End Cap",
    description: "Butt fusion end cap for pipe termination",
    weldingMethod: "butt_fusion",
    availableSdrValues: [11, 17, 21],
    minDnMm: 63,
    maxDnMm: 1200,
    pressureRated: true,
    standards: ["ASTM D3261", "ISO 4427-3"],
  },
  stub_end: {
    type: "stub_end",
    category: "butt_fusion",
    name: "Stub End",
    description: "Stub end for flange connections with backing ring",
    weldingMethod: "butt_fusion",
    availableSdrValues: [11, 17, 21],
    minDnMm: 63,
    maxDnMm: 630,
    pressureRated: true,
    standards: ["ASTM D3261", "ISO 4427-3", "AWWA C906"],
  },
  cross: {
    type: "cross",
    category: "butt_fusion",
    name: "Cross",
    description: "Four-way cross fitting",
    weldingMethod: "butt_fusion",
    availableSdrValues: [11, 17],
    minDnMm: 63,
    maxDnMm: 315,
    pressureRated: true,
    standards: ["ASTM D3261", "ISO 4427-3"],
  },
};

export const ELECTROFUSION_FITTINGS: Record<ElectrofusionFittingType, HdpeFitting> = {
  coupler: {
    type: "coupler",
    category: "electrofusion",
    name: "Coupler",
    description: "Straight coupler for joining two pipes",
    weldingMethod: "electrofusion",
    availableSdrValues: [11, 17, 21],
    minDnMm: 20,
    maxDnMm: 630,
    pressureRated: true,
    standards: ["ASTM F1055", "ISO 4427-3", "EN 12201-3"],
  },
  coupler_reducing: {
    type: "coupler_reducing",
    category: "electrofusion",
    name: "Reducing Coupler",
    description: "Coupler for joining pipes of different sizes",
    weldingMethod: "electrofusion",
    availableSdrValues: [11, 17, 21],
    minDnMm: 20,
    maxDnMm: 315,
    pressureRated: true,
    standards: ["ASTM F1055", "ISO 4427-3"],
  },
  elbow_90: {
    type: "elbow_90",
    category: "electrofusion",
    name: "90° Elbow",
    description: "Electrofusion 90-degree elbow",
    weldingMethod: "electrofusion",
    availableSdrValues: [11, 17, 21],
    minDnMm: 20,
    maxDnMm: 225,
    pressureRated: true,
    standards: ["ASTM F1055", "ISO 4427-3"],
  },
  elbow_45: {
    type: "elbow_45",
    category: "electrofusion",
    name: "45° Elbow",
    description: "Electrofusion 45-degree elbow",
    weldingMethod: "electrofusion",
    availableSdrValues: [11, 17, 21],
    minDnMm: 20,
    maxDnMm: 225,
    pressureRated: true,
    standards: ["ASTM F1055", "ISO 4427-3"],
  },
  tee_equal: {
    type: "tee_equal",
    category: "electrofusion",
    name: "Equal Tee",
    description: "Electrofusion equal tee",
    weldingMethod: "electrofusion",
    availableSdrValues: [11, 17, 21],
    minDnMm: 20,
    maxDnMm: 225,
    pressureRated: true,
    standards: ["ASTM F1055", "ISO 4427-3"],
  },
  tee_reducing: {
    type: "tee_reducing",
    category: "electrofusion",
    name: "Reducing Tee",
    description: "Electrofusion reducing tee",
    weldingMethod: "electrofusion",
    availableSdrValues: [11, 17, 21],
    minDnMm: 20,
    maxDnMm: 225,
    pressureRated: true,
    standards: ["ASTM F1055", "ISO 4427-3"],
  },
  saddle: {
    type: "saddle",
    category: "electrofusion",
    name: "Branch Saddle",
    description: "Saddle fusion fitting for branch connections without cutting main",
    weldingMethod: "electrofusion",
    availableSdrValues: [11, 17, 21],
    minDnMm: 63,
    maxDnMm: 630,
    pressureRated: true,
    standards: ["ASTM F1055", "ISO 4427-3", "EN 12201-3"],
  },
  tapping_tee: {
    type: "tapping_tee",
    category: "electrofusion",
    name: "Tapping Tee",
    description: "Under-pressure tapping tee for service connections",
    weldingMethod: "electrofusion",
    availableSdrValues: [11, 17, 21],
    minDnMm: 63,
    maxDnMm: 315,
    pressureRated: true,
    standards: ["ASTM F1055", "ISO 4427-3"],
  },
  end_cap: {
    type: "end_cap",
    category: "electrofusion",
    name: "End Cap",
    description: "Electrofusion end cap",
    weldingMethod: "electrofusion",
    availableSdrValues: [11, 17, 21],
    minDnMm: 20,
    maxDnMm: 225,
    pressureRated: true,
    standards: ["ASTM F1055", "ISO 4427-3"],
  },
  transition: {
    type: "transition",
    category: "electrofusion",
    name: "Transition Fitting",
    description: "PE to metal transition with electrofusion socket",
    weldingMethod: "electrofusion",
    availableSdrValues: [11, 17],
    minDnMm: 20,
    maxDnMm: 160,
    pressureRated: true,
    standards: ["ASTM F1055", "ISO 4427-3"],
  },
};

export const MECHANICAL_FITTINGS: Record<MechanicalFittingType, HdpeFitting> = {
  flange_adapter: {
    type: "flange_adapter",
    category: "mechanical",
    name: "Flange Adapter",
    description: "PE stub end with integral flange face",
    weldingMethod: "butt_fusion",
    availableSdrValues: [11, 17],
    minDnMm: 63,
    maxDnMm: 630,
    pressureRated: true,
    standards: ["ASTM D3261", "AWWA C906"],
  },
  backing_ring: {
    type: "backing_ring",
    category: "mechanical",
    name: "Backing Ring/Flange",
    description: "Metal backing ring for stub end flange connections",
    weldingMethod: "mechanical",
    availableSdrValues: [11, 17, 21],
    minDnMm: 63,
    maxDnMm: 630,
    pressureRated: true,
    standards: ["AWWA C906", "ASME B16.5"],
  },
  compression_coupling: {
    type: "compression_coupling",
    category: "mechanical",
    name: "Compression Coupling",
    description: "Mechanical compression fitting for joining pipes",
    weldingMethod: "mechanical",
    availableSdrValues: [11, 17, 21],
    minDnMm: 20,
    maxDnMm: 110,
    pressureRated: true,
    standards: ["ISO 14236", "EN 712"],
  },
  repair_coupling: {
    type: "repair_coupling",
    category: "mechanical",
    name: "Repair Coupling",
    description: "Full-circle repair clamp for damaged pipe sections",
    weldingMethod: "mechanical",
    availableSdrValues: [11, 17, 21],
    minDnMm: 63,
    maxDnMm: 630,
    pressureRated: true,
    standards: ["AWWA C219"],
  },
  mj_adapter: {
    type: "mj_adapter",
    category: "mechanical",
    name: "MJ Adapter",
    description: "Mechanical joint adapter for connection to ductile iron",
    weldingMethod: "mechanical",
    availableSdrValues: [11, 17],
    minDnMm: 63,
    maxDnMm: 630,
    pressureRated: true,
    standards: ["AWWA C906", "AWWA C111"],
  },
  transition_fitting: {
    type: "transition_fitting",
    category: "mechanical",
    name: "Transition Fitting",
    description: "Mechanical transition to other pipe materials",
    weldingMethod: "mechanical",
    availableSdrValues: [11, 17, 21],
    minDnMm: 20,
    maxDnMm: 315,
    pressureRated: true,
    standards: ["ASTM D2513", "ISO 4427-3"],
  },
  service_saddle: {
    type: "service_saddle",
    category: "mechanical",
    name: "Service Saddle",
    description: "Mechanical saddle for service line connections",
    weldingMethod: "mechanical",
    availableSdrValues: [11, 17, 21],
    minDnMm: 63,
    maxDnMm: 315,
    pressureRated: true,
    standards: ["AWWA C800"],
  },
};

export const FLANGE_FITTINGS: Record<HdpeFlangeType, HdpeFitting> = {
  stub_end_flange: {
    type: "stub_end_flange",
    category: "flange",
    name: "Stub End with Backing Flange",
    description: "PE stub end with metal backing flange assembly",
    weldingMethod: "butt_fusion",
    availableSdrValues: [11, 17],
    minDnMm: 63,
    maxDnMm: 630,
    pressureRated: true,
    standards: ["ASTM D3261", "AWWA C906", "ASME B16.5"],
  },
  backing_flange: {
    type: "backing_flange",
    category: "flange",
    name: "Backing Flange",
    description: "Metal backing flange for stub end connections",
    weldingMethod: "mechanical",
    availableSdrValues: [11, 17, 21],
    minDnMm: 63,
    maxDnMm: 630,
    pressureRated: true,
    standards: ["ASME B16.5", "EN 1092-1"],
  },
  lap_joint: {
    type: "lap_joint",
    category: "flange",
    name: "Lap Joint Flange",
    description: "Loose flange for stub end connections",
    weldingMethod: "mechanical",
    availableSdrValues: [11, 17, 21],
    minDnMm: 63,
    maxDnMm: 630,
    pressureRated: true,
    standards: ["ASME B16.5", "EN 1092-1"],
  },
  blind_flange: {
    type: "blind_flange",
    category: "flange",
    name: "Blind Flange",
    description: "Solid flange for pipe termination",
    weldingMethod: "mechanical",
    availableSdrValues: [11, 17, 21],
    minDnMm: 63,
    maxDnMm: 630,
    pressureRated: true,
    standards: ["ASME B16.5", "EN 1092-1"],
  },
};

export interface FittingStandard {
  code: string;
  name: string;
  description: string;
  region: string;
  fittingTypes: HdpeFittingCategory[];
}

export const HDPE_FITTING_STANDARDS: FittingStandard[] = [
  {
    code: "ASTM D3261",
    name: "ASTM D3261",
    description: "Butt Heat Fusion Polyethylene (PE) Plastic Fittings for PE Pipe and Tubing",
    region: "US",
    fittingTypes: ["butt_fusion"],
  },
  {
    code: "ASTM F1055",
    name: "ASTM F1055",
    description: "Electrofusion Type Polyethylene Fittings for Outside Diameter Controlled PE Pipe",
    region: "US",
    fittingTypes: ["electrofusion"],
  },
  {
    code: "ISO 4427-3",
    name: "ISO 4427-3",
    description: "Plastics piping systems for water supply - PE - Part 3: Fittings",
    region: "International",
    fittingTypes: ["butt_fusion", "electrofusion", "mechanical"],
  },
  {
    code: "EN 12201-3",
    name: "EN 12201-3",
    description: "Plastics piping systems for water supply - PE - Part 3: Fittings",
    region: "EU",
    fittingTypes: ["butt_fusion", "electrofusion", "mechanical"],
  },
  {
    code: "AWWA C906",
    name: "AWWA C906",
    description: "Polyethylene (PE) Pressure Pipe and Fittings, 4 In. Through 65 In.",
    region: "US",
    fittingTypes: ["butt_fusion", "mechanical", "flange"],
  },
];

export const ALL_FITTINGS = {
  ...BUTT_FUSION_FITTINGS,
  ...ELECTROFUSION_FITTINGS,
  ...MECHANICAL_FITTINGS,
  ...FLANGE_FITTINGS,
};

export const fittingsByCategory = (category: HdpeFittingCategory): HdpeFitting[] => {
  switch (category) {
    case "butt_fusion":
      return Object.values(BUTT_FUSION_FITTINGS);
    case "electrofusion":
      return Object.values(ELECTROFUSION_FITTINGS);
    case "mechanical":
      return Object.values(MECHANICAL_FITTINGS);
    case "flange":
      return Object.values(FLANGE_FITTINGS);
    default:
      return [];
  }
};

export const fittingsForDn = (dnMm: number): HdpeFitting[] => {
  return Object.values(ALL_FITTINGS).filter(
    (fitting) => dnMm >= fitting.minDnMm && dnMm <= fitting.maxDnMm,
  );
};

export const fittingsForSdr = (sdr: SdrValue): HdpeFitting[] => {
  return Object.values(ALL_FITTINGS).filter((fitting) => fitting.availableSdrValues.includes(sdr));
};

export const fittingsForWeldingMethod = (method: HdpeWeldingMethod): HdpeFitting[] => {
  return Object.values(ALL_FITTINGS).filter((fitting) => fitting.weldingMethod === method);
};

export interface FittingSelectionResult {
  fitting: HdpeFitting;
  compatible: boolean;
  reasons: string[];
}

export const checkFittingCompatibility = (
  fittingType: string,
  dnMm: number,
  sdr: SdrValue,
): FittingSelectionResult | null => {
  const fitting = ALL_FITTINGS[fittingType as keyof typeof ALL_FITTINGS];
  if (!fitting) {
    return null;
  }

  const reasons: string[] = [];

  if (dnMm < fitting.minDnMm) {
    reasons.push(`DN ${dnMm}mm is below minimum ${fitting.minDnMm}mm for this fitting`);
  }
  if (dnMm > fitting.maxDnMm) {
    reasons.push(`DN ${dnMm}mm exceeds maximum ${fitting.maxDnMm}mm for this fitting`);
  }
  if (!fitting.availableSdrValues.includes(sdr)) {
    reasons.push(
      `SDR ${sdr} is not available for this fitting (available: ${fitting.availableSdrValues.join(", ")})`,
    );
  }

  return {
    fitting,
    compatible: reasons.length === 0,
    reasons,
  };
};

export const thrustBlockRequired = (weldingMethod: HdpeWeldingMethod): boolean => {
  return weldingMethod === "mechanical";
};

export const recommendedFittingCategory = (
  dnMm: number,
  pressureService: boolean,
): HdpeFittingCategory => {
  if (!pressureService) {
    return "mechanical";
  }
  if (dnMm >= 63) {
    return "butt_fusion";
  }
  return "electrofusion";
};
