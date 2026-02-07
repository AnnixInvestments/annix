export interface PvcStandard {
  id: number;
  code: string;
  name: string;
  description: string | null;
  organization: string | null;
  region: string | null;
  applicableTo: string | null;
  displayOrder: number;
  isActive: boolean;
}

export interface PvcPipeSpecification {
  id: number;
  nominalDiameter: number;
  outerDiameter: number;
  pressureRating: number;
  wallThickness: number;
  innerDiameter: number;
  weightKgPerM: number;
  pvcType: string;
  standard: string;
  displayOrder: number;
  isActive: boolean;
}

export interface PvcFittingType {
  id: number;
  name: string;
  code: string;
  description: string | null;
  numJoints: number;
  isSocket: boolean;
  isFlanged: boolean;
  isThreaded: boolean;
  category: string | null;
  angleDegrees: number | null;
  displayOrder: number;
  isActive: boolean;
}

export interface PvcFittingWeight {
  id: number;
  fittingTypeId: number;
  nominalDiameter: number;
  pressureRating: number | null;
  weightKg: number;
  isActive: boolean;
}

export interface PvcCementPrice {
  id: number;
  nominalDiameter: number;
  pricePerJoint: number;
  currency: string;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  isActive: boolean;
}

export interface CalculatePvcPipeCostDto {
  nominalDiameter: number;
  pressureRating: number;
  length: number;
  pricePerKg: number;
  pvcType?: string;
  cementJointPrice?: number;
}

export interface PvcPipeCostResponse {
  nominalDiameter: number;
  pressureRating: number;
  pvcType: string;
  length: number;
  outerDiameter: number;
  wallThickness: number;
  innerDiameter: number;
  weightKgPerM: number;
  totalWeight: number;
  numJoints: number;
  materialCost: number;
  cementJointCost: number;
  totalCost: number;
  pricePerKg: number;
  cementJointPrice: number;
}

export interface CalculatePvcFittingCostDto {
  fittingTypeCode: string;
  nominalDiameter: number;
  pricePerKg: number;
  pressureRating?: number;
  cementJointPrice?: number;
}

export interface PvcFittingCostResponse {
  fittingType: string;
  fittingTypeCode: string;
  nominalDiameter: number;
  weightKg: number;
  numJoints: number;
  isSocket: boolean;
  isFlanged: boolean;
  isThreaded: boolean;
  materialCost: number;
  cementJointCost: number;
  totalCost: number;
  pricePerKg: number;
  cementJointPrice: number;
}

export interface PvcItemInput {
  type: string;
  nominalDiameter: number;
  pressureRating?: number;
  length?: number;
  quantity?: number;
}

export interface PvcTransportWeightItem {
  type: string;
  nominalDiameter: number;
  pressureRating?: number;
  length?: number;
  quantity: number;
  weightKg: number;
}

export interface PvcTransportWeightResponse {
  items: PvcTransportWeightItem[];
  totalWeight: number;
  itemCount: number;
}

export const PVC_TYPES = {
  "PVC-U": { density: 1400, description: "Unplasticized PVC-U per EN 1452" },
  CPVC: { density: 1520, description: "Chlorinated PVC" },
  "PVC-O": { density: 1420, description: "Oriented PVC" },
  "PVC-M": { density: 1400, description: "Modified PVC" },
};

export const PN_VALUES = [6, 8, 10, 12.5, 16, 20, 25];

export const NOMINAL_DIAMETERS = [
  12, 16, 20, 25, 32, 40, 50, 63, 75, 90, 110, 125, 140, 160, 180, 200, 225, 250, 280, 315, 355,
  400, 450, 500, 560, 630, 710, 800, 900, 1000,
];

export const FITTING_CATEGORIES = {
  elbow: "Elbows",
  tee: "Tees",
  coupling: "Couplings",
  reducer: "Reducers",
  cap: "End Caps",
  union: "Unions",
  valve: "Valves",
};

export const FITTING_TYPES = [
  {
    code: "straight_pipe",
    name: "Straight Pipe",
    category: "pipe",
    joints: 0,
    description: "Straight lengths",
  },
  {
    code: "elbow_90",
    name: "90° Elbow",
    category: "elbow",
    joints: 2,
    description: "Socket elbow 90°",
  },
  {
    code: "elbow_45",
    name: "45° Elbow",
    category: "elbow",
    joints: 2,
    description: "Socket elbow 45°",
  },
  { code: "tee", name: "Equal Tee", category: "tee", joints: 3, description: "Socket tee equal" },
  {
    code: "reducing_tee",
    name: "Reducing Tee",
    category: "tee",
    joints: 3,
    description: "Socket tee reducing",
  },
  {
    code: "coupling",
    name: "Coupling",
    category: "coupling",
    joints: 2,
    description: "Socket coupling",
  },
  {
    code: "reducer",
    name: "Reducer",
    category: "reducer",
    joints: 2,
    description: "Concentric reducer",
  },
  { code: "end_cap", name: "End Cap", category: "cap", joints: 1, description: "Socket end cap" },
  { code: "union", name: "Union", category: "union", joints: 2, description: "Socket union" },
];

export const PVC_U_DENSITY = 1400;

export function calculateWeightPerMeter(
  dn: number,
  wallThickness: number,
  density: number = PVC_U_DENSITY,
): number {
  const od = dn;
  const id = od - 2 * wallThickness;
  const area = (Math.PI / 4) * (od ** 2 - id ** 2) * 1e-6;
  return Math.round(area * density * 100) / 100;
}
