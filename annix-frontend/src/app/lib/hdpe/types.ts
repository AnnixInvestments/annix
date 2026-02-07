export interface HdpeStandard {
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

export interface HdpePipeSpecification {
  id: number;
  nominalBore: number;
  outerDiameter: number;
  sdr: number;
  wallThickness: number;
  innerDiameter: number;
  weightKgPerM: number;
  pressureRatingPn: number;
  materialGrade: string;
  isActive: boolean;
}

export interface HdpeFittingType {
  id: number;
  name: string;
  code: string;
  numButtwelds: number;
  isMolded: boolean;
  isFabricated: boolean;
  category: string;
  displayOrder: number;
  isActive: boolean;
}

export interface HdpeFittingWeight {
  id: number;
  fittingTypeId: number;
  nominalBore: number;
  weightKg: number;
  isActive: boolean;
}

export interface HdpeButtweldPrice {
  id: number;
  nominalBore: number;
  pricePerWeld: number;
  currency: string;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  isActive: boolean;
}

export interface HdpeStubPrice {
  id: number;
  nominalBore: number;
  pricePerStub: number;
  weightKg: number | null;
  currency: string;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  isActive: boolean;
}

export interface CalculatePipeCostDto {
  nominalBore: number;
  sdr: number;
  length: number;
  pricePerKg: number;
  buttweldPrice?: number;
}

export interface PipeCostResponse {
  nominalBore: number;
  sdr: number;
  length: number;
  outerDiameter: number;
  wallThickness: number;
  innerDiameter: number;
  weightPerMeter: number;
  pressureRating: number;
  materialGrade: string;
  totalWeight: number;
  materialCost: number;
  buttweldCost: number;
  totalCost: number;
}

export interface CalculateFittingCostDto {
  fittingTypeCode: string;
  nominalBore: number;
  pricePerKg: number;
  buttweldPrice?: number;
  stubPrice?: number;
}

export interface FittingCostResponse {
  fittingType: string;
  fittingCode: string;
  nominalBore: number;
  weightKg: number;
  numButtwelds: number;
  isMolded: boolean;
  isFabricated: boolean;
  materialCost: number;
  buttweldCost: number;
  stubCost: number;
  totalCost: number;
}

export interface HdpeItemInput {
  type: string;
  nominalBore: number;
  sdr?: number;
  length?: number;
  quantity?: number;
}

export interface TransportWeightItem {
  type: string;
  nominalBore: number;
  sdr?: number;
  length?: number;
  weightKg: number;
}

export interface TransportWeightResponse {
  items: TransportWeightItem[];
  totalWeight: number;
  itemCount: number;
}

export const HDPE_STANDARDS_INFO = [
  { code: "ISO_4427", name: "ISO 4427", description: "For water supply pipes" },
  {
    code: "EN_12201",
    name: "EN 12201",
    description: "For plastic piping systems for water supply",
  },
  {
    code: "ASTM_F714",
    name: "ASTM F714",
    description: "For polyethylene plastic pipe based on outside diameter",
  },
  {
    code: "AWWA_C906",
    name: "AWWA C906",
    description: "For polyethylene pressure pipe and fittings, 4 in. through 65 in.",
  },
  {
    code: "ASTM_D3350",
    name: "ASTM D3350",
    description: "Cell classification PE4710 for high-performance HDPE",
  },
];

export const SDR_VALUES = [6, 7.4, 9, 11, 13.6, 17, 21, 26, 32.5];

export const NOMINAL_BORES = [
  20, 25, 32, 40, 50, 63, 75, 90, 110, 125, 140, 160, 180, 200, 225, 250, 280, 315, 355, 400, 450,
  500, 560, 630, 710, 800, 900, 1000, 1200,
];

export const FITTING_CATEGORIES = {
  elbow: "Elbows",
  tee: "Tees",
  reducer: "Reducers",
  cap: "End Caps",
  stub: "Stub Ends",
  pipe: "Straight Pipe",
};

export const FITTING_TYPES = [
  {
    code: "straight_pipe",
    name: "Straight Pipe",
    category: "pipe",
    welds: 0,
    description: "Straight lengths",
  },
  {
    code: "molded_90_elbow",
    name: "90° Elbow (Molded)",
    category: "elbow",
    welds: 0,
    description: "Molded, no welds",
  },
  {
    code: "fab_90_elbow_3seg",
    name: "90° Elbow (3-Segment)",
    category: "elbow",
    welds: 2,
    description: "Fabricated 3 segments, 2 welds",
  },
  {
    code: "fab_90_elbow_5seg",
    name: "90° Elbow (5-Segment)",
    category: "elbow",
    welds: 4,
    description: "Fabricated 5 segments, 4 welds",
  },
  {
    code: "fab_45_elbow_2seg",
    name: "45° Elbow (2-Segment)",
    category: "elbow",
    welds: 1,
    description: "Fabricated 2 segments, 1 weld",
  },
  {
    code: "fab_45_elbow_3seg",
    name: "45° Elbow (3-Segment)",
    category: "elbow",
    welds: 2,
    description: "Fabricated 3 segments, 2 welds",
  },
  {
    code: "molded_tee",
    name: "Tee (Molded)",
    category: "tee",
    welds: 0,
    description: "Molded tee",
  },
  {
    code: "fab_tee",
    name: "Tee (Fabricated)",
    category: "tee",
    welds: 1,
    description: "Fabricated tee, 1 weld for branch",
  },
  {
    code: "reducer",
    name: "Reducer (Molded)",
    category: "reducer",
    welds: 0,
    description: "Molded reducer",
  },
  {
    code: "fab_reducer",
    name: "Reducer (Fabricated)",
    category: "reducer",
    welds: 1,
    description: "Fabricated reducer, 1 weld",
  },
  { code: "end_cap", name: "End Cap", category: "cap", welds: 0, description: "End cap, no welds" },
  {
    code: "stub_end",
    name: "Stub End",
    category: "stub",
    welds: 0,
    description: "Stub for flange connection",
  },
];

export const HDPE_DENSITY = 955;

export function calculatePressureRating(
  sdr: number,
  materialGrade: "PE100" | "PE80" = "PE100",
): number {
  const mrs = materialGrade === "PE100" ? 10 : 8;
  const safetyFactor = 1.25;
  return Math.round(((2 * mrs) / ((sdr - 1) * safetyFactor)) * 10) / 10;
}

export function calculateWallThickness(od: number, sdr: number): number {
  return Math.round((od / sdr) * 100) / 100;
}

export function calculateInnerDiameter(od: number, wallThickness: number): number {
  return Math.round((od - 2 * wallThickness) * 100) / 100;
}

export function calculateWeightPerMeter(od: number, sdr: number): number {
  const wall = od / sdr;
  const id = od - 2 * wall;
  const crossSectionArea = (Math.PI / 4) * (od ** 2 - id ** 2) * 1e-6;
  return Math.round(crossSectionArea * HDPE_DENSITY * 1000) / 1000;
}
