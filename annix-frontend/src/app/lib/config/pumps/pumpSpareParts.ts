// Pumps & Pump Parts Module - Spare Parts Configuration

import { nowISO } from "@/app/lib/datetime";

export interface SparePartCategory {
  value: string;
  label: string;
  description: string;
  icon: string;
  parts: SparePart[];
}

export interface SparePart {
  value: string;
  label: string;
  description: string;
  specificationFields?: string[];
}

// ============================================
// OEM PART NUMBER CROSS-REFERENCE
// ============================================

export interface OemCrossReference {
  originalOem: string;
  originalPartNumber: string;
  equivalentOem: string;
  equivalentPartNumber: string;
  partType: string;
  notes?: string;
  verifiedDate?: string;
  compatibility: "exact" | "functional" | "modified";
}

export interface OemManufacturer {
  value: string;
  label: string;
  country: string;
  commonModels: string[];
}

export const PUMP_OEM_MANUFACTURERS: OemManufacturer[] = [
  {
    value: "ksb",
    label: "KSB",
    country: "Germany",
    commonModels: ["Etanorm", "Etabloc", "Omega", "Movitec"],
  },
  {
    value: "grundfos",
    label: "Grundfos",
    country: "Denmark",
    commonModels: ["CR", "CRN", "NB", "NK", "SE", "SL"],
  },
  {
    value: "sulzer",
    label: "Sulzer",
    country: "Switzerland",
    commonModels: ["Ahlstar", "CPT", "HPT", "MBN"],
  },
  {
    value: "flowserve",
    label: "Flowserve",
    country: "USA",
    commonModels: ["Durco", "Worthington", "Byron Jackson"],
  },
  {
    value: "weir",
    label: "Weir Minerals",
    country: "UK",
    commonModels: ["Warman", "Envirotech", "Geho"],
  },
  {
    value: "itt_goulds",
    label: "ITT Goulds",
    country: "USA",
    commonModels: ["3196", "3296", "IC", "LF"],
  },
  { value: "ebara", label: "Ebara", country: "Japan", commonModels: ["FSA", "FHA", "DL", "DS"] },
  {
    value: "pentair",
    label: "Pentair / Aurora",
    country: "USA",
    commonModels: ["Aurora", "Fairbanks Nijhuis"],
  },
  {
    value: "ruhrpumpen",
    label: "Ruhrpumpen",
    country: "Germany",
    commonModels: ["SCE", "SCP", "ZW"],
  },
  { value: "andritz", label: "Andritz", country: "Austria", commonModels: ["A", "ACP", "S"] },
  {
    value: "alfa_laval",
    label: "Alfa Laval",
    country: "Sweden",
    commonModels: ["LKH", "SRU", "SX"],
  },
  {
    value: "spx_flow",
    label: "SPX Flow",
    country: "USA",
    commonModels: ["W+", "Universal", "Johnson"],
  },
  {
    value: "sterling",
    label: "Sterling SIHI",
    country: "Germany",
    commonModels: ["ZLND", "CEH", "LPH"],
  },
  {
    value: "local_za",
    label: "Local (South Africa)",
    country: "South Africa",
    commonModels: ["Various"],
  },
];

export interface PartNumberFormat {
  oem: string;
  format: string;
  example: string;
  description: string;
}

export const PART_NUMBER_FORMATS: PartNumberFormat[] = [
  {
    oem: "ksb",
    format: "XXXXX-XXX-XX",
    example: "48293-001-05",
    description: "KSB uses 5-digit base, 3-digit variant, 2-digit size",
  },
  {
    oem: "grundfos",
    format: "XX-XXXXXXXX",
    example: "96-94567812",
    description: "Grundfos uses 2-digit prefix and 8-digit serial",
  },
  {
    oem: "flowserve",
    format: "XXX-XXXXX",
    example: "DUR-12345",
    description: "Flowserve uses brand prefix and 5-digit part number",
  },
  {
    oem: "weir",
    format: "AXXXX-XXX-XXX",
    example: "A05518-001-001",
    description: "Weir uses letter prefix, 5-digit part, variants",
  },
];

export const createOemCrossReference = (
  originalOem: string,
  originalPartNumber: string,
  equivalentOem: string,
  equivalentPartNumber: string,
  partType: string,
  compatibility: "exact" | "functional" | "modified" = "functional",
  notes?: string,
): OemCrossReference => ({
  originalOem,
  originalPartNumber,
  equivalentOem,
  equivalentPartNumber,
  partType,
  compatibility,
  notes,
  verifiedDate: nowISO().split("T")[0],
});

// ============================================
// SEAL FACE MATERIAL COMBINATIONS
// ============================================

export interface SealFaceMaterial {
  value: string;
  label: string;
  hardness: string;
  maxTemp: number;
  chemicalResistance: string;
  abrasionResistance: string;
  costFactor: number;
}

export const SEAL_FACE_MATERIALS: SealFaceMaterial[] = [
  {
    value: "carbon_graphite",
    label: "Carbon Graphite",
    hardness: "Soft",
    maxTemp: 260,
    chemicalResistance: "Good - except strong oxidizers",
    abrasionResistance: "Fair",
    costFactor: 1.0,
  },
  {
    value: "carbon_antimony",
    label: "Carbon Antimony Impregnated",
    hardness: "Soft",
    maxTemp: 260,
    chemicalResistance: "Excellent",
    abrasionResistance: "Good",
    costFactor: 1.3,
  },
  {
    value: "sic_reaction_bonded",
    label: "Silicon Carbide (Reaction Bonded)",
    hardness: "Hard",
    maxTemp: 350,
    chemicalResistance: "Excellent",
    abrasionResistance: "Excellent",
    costFactor: 2.5,
  },
  {
    value: "sic_sintered",
    label: "Silicon Carbide (Sintered/Self-Sintered)",
    hardness: "Very Hard",
    maxTemp: 450,
    chemicalResistance: "Excellent",
    abrasionResistance: "Excellent",
    costFactor: 3.5,
  },
  {
    value: "tungsten_carbide",
    label: "Tungsten Carbide",
    hardness: "Very Hard",
    maxTemp: 400,
    chemicalResistance: "Good - limited in some acids",
    abrasionResistance: "Excellent",
    costFactor: 4.0,
  },
  {
    value: "ceramic_al2o3",
    label: "Ceramic (Alumina Al2O3)",
    hardness: "Hard",
    maxTemp: 300,
    chemicalResistance: "Good",
    abrasionResistance: "Good",
    costFactor: 1.8,
  },
];

export interface SealFaceCombination {
  value: string;
  label: string;
  rotatingFace: string;
  stationaryFace: string;
  application: string;
  fluidTypes: string[];
  maxPV: number;
  notes: string;
}

export const SEAL_FACE_COMBINATIONS: SealFaceCombination[] = [
  {
    value: "carbon_sic",
    label: "Carbon vs SiC",
    rotatingFace: "carbon_graphite",
    stationaryFace: "sic_reaction_bonded",
    application: "General purpose - most common",
    fluidTypes: ["water", "light hydrocarbons", "chemicals"],
    maxPV: 175,
    notes: "Industry standard for most applications",
  },
  {
    value: "carbon_tungsten",
    label: "Carbon vs Tungsten Carbide",
    rotatingFace: "carbon_graphite",
    stationaryFace: "tungsten_carbide",
    application: "High pressure, clean fluids",
    fluidTypes: ["water", "light oils", "clean chemicals"],
    maxPV: 200,
    notes: "Good for higher pressures, avoid abrasives",
  },
  {
    value: "carbon_ceramic",
    label: "Carbon vs Ceramic",
    rotatingFace: "carbon_graphite",
    stationaryFace: "ceramic_al2o3",
    application: "Budget option, light duty",
    fluidTypes: ["water", "dilute chemicals"],
    maxPV: 100,
    notes: "Cost effective for light duty applications",
  },
  {
    value: "sic_sic",
    label: "SiC vs SiC (Hard/Hard)",
    rotatingFace: "sic_sintered",
    stationaryFace: "sic_reaction_bonded",
    application: "Abrasive fluids, slurries",
    fluidTypes: ["slurries", "abrasive fluids", "high temp"],
    maxPV: 500,
    notes: "Requires excellent lubrication, flush recommended",
  },
  {
    value: "tungsten_tungsten",
    label: "TC vs TC (Hard/Hard)",
    rotatingFace: "tungsten_carbide",
    stationaryFace: "tungsten_carbide",
    application: "Extreme abrasion, mining",
    fluidTypes: ["heavy slurries", "abrasive media"],
    maxPV: 450,
    notes: "Highest cost, extreme duty only",
  },
  {
    value: "carbon_antimony_sic",
    label: "Carbon (Antimony) vs SiC",
    rotatingFace: "carbon_antimony",
    stationaryFace: "sic_sintered",
    application: "Chemical service, dry running capability",
    fluidTypes: ["chemicals", "solvents", "hot water"],
    maxPV: 250,
    notes: "Better chemical resistance than standard carbon",
  },
];

export const getSealFaceCombination = (value: string): SealFaceCombination | undefined =>
  SEAL_FACE_COMBINATIONS.find((c) => c.value === value);

export const recommendSealFaces = (
  fluidType: string,
  hasAbrasives: boolean,
  maxTempC: number,
): SealFaceCombination[] => {
  return SEAL_FACE_COMBINATIONS.filter((combo) => {
    if (hasAbrasives && !combo.value.includes("sic_sic") && !combo.value.includes("tungsten")) {
      return false;
    }
    const rotatingMat = SEAL_FACE_MATERIALS.find((m) => m.value === combo.rotatingFace);
    const stationaryMat = SEAL_FACE_MATERIALS.find((m) => m.value === combo.stationaryFace);
    if (rotatingMat && stationaryMat) {
      const maxAllowedTemp = Math.min(rotatingMat.maxTemp, stationaryMat.maxTemp);
      if (maxTempC > maxAllowedTemp) return false;
    }
    return true;
  });
};

// ============================================
// BEARING TYPES AND SPECIFICATIONS
// ============================================

export interface BearingType {
  value: string;
  label: string;
  category: "rolling" | "plain";
  subType: string;
  loadCapacity: "radial" | "thrust" | "combined";
  speedCapability: "low" | "medium" | "high" | "very_high";
  advantages: string[];
  limitations: string[];
  typicalApplications: string[];
}

export const BEARING_TYPES: BearingType[] = [
  {
    value: "deep_groove_ball",
    label: "Deep Groove Ball Bearing",
    category: "rolling",
    subType: "ball",
    loadCapacity: "combined",
    speedCapability: "very_high",
    advantages: [
      "High speed capability",
      "Low friction",
      "Low maintenance",
      "Handles combined loads",
    ],
    limitations: ["Limited heavy load capacity", "Sensitive to misalignment"],
    typicalApplications: ["Light to medium duty pumps", "High speed pumps", "Vertical pumps"],
  },
  {
    value: "angular_contact_ball",
    label: "Angular Contact Ball Bearing",
    category: "rolling",
    subType: "ball",
    loadCapacity: "combined",
    speedCapability: "high",
    advantages: ["High thrust load capacity", "Good for combined loads", "Precise positioning"],
    limitations: ["Requires preload", "More expensive than deep groove"],
    typicalApplications: ["API pumps", "High pressure pumps", "Paired for thrust loads"],
  },
  {
    value: "cylindrical_roller",
    label: "Cylindrical Roller Bearing",
    category: "rolling",
    subType: "roller",
    loadCapacity: "radial",
    speedCapability: "high",
    advantages: [
      "Very high radial load capacity",
      "Good for heavy loads",
      "Allows axial displacement",
    ],
    limitations: ["No thrust load capacity (most types)", "Larger than ball bearings"],
    typicalApplications: ["Heavy duty pumps", "Slurry pumps", "Large process pumps"],
  },
  {
    value: "spherical_roller",
    label: "Spherical Roller Bearing",
    category: "rolling",
    subType: "roller",
    loadCapacity: "combined",
    speedCapability: "medium",
    advantages: ["Self-aligning", "Very high load capacity", "Tolerates misalignment"],
    limitations: ["Higher friction", "Lower speed limits"],
    typicalApplications: [
      "Slurry pumps",
      "Heavy industrial pumps",
      "Pumps with flexible couplings",
    ],
  },
  {
    value: "tapered_roller",
    label: "Tapered Roller Bearing",
    category: "rolling",
    subType: "roller",
    loadCapacity: "combined",
    speedCapability: "medium",
    advantages: ["High combined load capacity", "Adjustable clearance", "Good rigidity"],
    limitations: ["Requires careful adjustment", "Paired mounting typical"],
    typicalApplications: ["API 610 pumps", "Process pumps", "Heavy duty applications"],
  },
  {
    value: "thrust_ball",
    label: "Thrust Ball Bearing",
    category: "rolling",
    subType: "ball",
    loadCapacity: "thrust",
    speedCapability: "medium",
    advantages: ["Handles pure thrust loads", "Simple design", "Compact"],
    limitations: ["No radial load capacity", "Moderate speed limit"],
    typicalApplications: ["Vertical pumps", "Multistage pumps", "Combined with radial bearing"],
  },
  {
    value: "sleeve_bronze",
    label: "Bronze Sleeve Bearing",
    category: "plain",
    subType: "sleeve",
    loadCapacity: "radial",
    speedCapability: "low",
    advantages: ["Simple design", "Low cost", "Quiet operation", "Handles shock loads"],
    limitations: ["Requires lubrication", "Higher friction", "Lower speed capability"],
    typicalApplications: ["Vertical turbine pumps", "Submerged pumps", "Line shaft pumps"],
  },
  {
    value: "sleeve_carbon",
    label: "Carbon/Graphite Sleeve Bearing",
    category: "plain",
    subType: "sleeve",
    loadCapacity: "radial",
    speedCapability: "medium",
    advantages: ["Self-lubricating", "Handles process fluid lubrication", "Good for abrasives"],
    limitations: ["Limited load capacity", "Can be brittle"],
    typicalApplications: ["Mag-drive pumps", "Canned motor pumps", "Submerged bearings"],
  },
  {
    value: "sleeve_ceramic",
    label: "Ceramic Sleeve Bearing",
    category: "plain",
    subType: "sleeve",
    loadCapacity: "radial",
    speedCapability: "medium",
    advantages: [
      "Excellent chemical resistance",
      "Good for abrasives",
      "High temperature capability",
    ],
    limitations: ["Brittle", "Higher cost", "Requires careful handling"],
    typicalApplications: ["Chemical pumps", "High temperature", "Corrosive services"],
  },
];

export const getBearingsByCategory = (category: "rolling" | "plain"): BearingType[] =>
  BEARING_TYPES.filter((b) => b.category === category);

export const getBearingsByLoadType = (loadType: "radial" | "thrust" | "combined"): BearingType[] =>
  BEARING_TYPES.filter((b) => b.loadCapacity === loadType);

// ============================================
// IMPELLER TRIM / DIAMETER OPTIONS
// ============================================

export interface ImpellerTrimOption {
  value: string;
  label: string;
  percentOfMax: number;
  description: string;
  efficiencyImpact: string;
}

export const STANDARD_IMPELLER_TRIMS: ImpellerTrimOption[] = [
  {
    value: "max",
    label: "Maximum Diameter",
    percentOfMax: 100,
    description: "Full size impeller - maximum head",
    efficiencyImpact: "Optimal efficiency at design point",
  },
  {
    value: "trim_95",
    label: "95% Trim",
    percentOfMax: 95,
    description: "Light trim for minor adjustment",
    efficiencyImpact: "Minimal efficiency loss (~1%)",
  },
  {
    value: "trim_90",
    label: "90% Trim",
    percentOfMax: 90,
    description: "Moderate trim",
    efficiencyImpact: "Slight efficiency loss (~2-3%)",
  },
  {
    value: "trim_85",
    label: "85% Trim",
    percentOfMax: 85,
    description: "Standard trim range",
    efficiencyImpact: "Moderate efficiency loss (~3-5%)",
  },
  {
    value: "trim_80",
    label: "80% Trim",
    percentOfMax: 80,
    description: "Significant trim",
    efficiencyImpact: "Notable efficiency loss (~5-7%)",
  },
  {
    value: "trim_75",
    label: "75% Trim",
    percentOfMax: 75,
    description: "Heavy trim - near minimum",
    efficiencyImpact: "Significant efficiency loss (~7-10%)",
  },
  {
    value: "min",
    label: "Minimum Diameter",
    percentOfMax: 70,
    description: "Minimum allowable trim",
    efficiencyImpact: "Maximum efficiency penalty - consider smaller pump",
  },
];

export interface ImpellerDiameterSpec {
  pumpModel: string;
  maxDiameterMm: number;
  minDiameterMm: number;
  standardDiametersMm: number[];
  materialOptions: string[];
}

export const calculateTrimmedPerformance = (
  originalFlowM3h: number,
  originalHeadM: number,
  originalDiameterMm: number,
  trimmedDiameterMm: number,
): { flowM3h: number; headM: number; efficiencyFactor: number } => {
  const ratio = trimmedDiameterMm / originalDiameterMm;
  const trimPercent = ratio * 100;

  let efficiencyFactor = 1.0;
  if (trimPercent < 100) {
    efficiencyFactor = 1 - 0.002 * (100 - trimPercent);
  }

  return {
    flowM3h: Math.round(originalFlowM3h * ratio * 100) / 100,
    headM: Math.round(originalHeadM * ratio ** 2 * 100) / 100,
    efficiencyFactor: Math.round(efficiencyFactor * 1000) / 1000,
  };
};

export const recommendImpellerTrim = (
  requiredHeadM: number,
  maxHeadM: number,
  minHeadM: number,
): {
  recommendedTrim: ImpellerTrimOption;
  estimatedDiameterPercent: number;
  warning: string | null;
} => {
  const headRatio = requiredHeadM / maxHeadM;
  const diameterRatio = Math.sqrt(headRatio);
  const percentOfMax = diameterRatio * 100;

  const minAllowedPercent = Math.sqrt(minHeadM / maxHeadM) * 100;

  let warning: string | null = null;
  if (percentOfMax < minAllowedPercent) {
    warning = "Required head is below minimum trim capability - consider smaller pump";
  } else if (percentOfMax < 75) {
    warning = "Excessive trim required - significant efficiency penalty expected";
  }

  const recommendedTrim = STANDARD_IMPELLER_TRIMS.reduce((closest, trim) => {
    const closestDiff = Math.abs(closest.percentOfMax - percentOfMax);
    const trimDiff = Math.abs(trim.percentOfMax - percentOfMax);
    return trimDiff < closestDiff && trim.percentOfMax >= percentOfMax ? trim : closest;
  }, STANDARD_IMPELLER_TRIMS[0]);

  return {
    recommendedTrim,
    estimatedDiameterPercent: Math.round(percentOfMax * 10) / 10,
    warning,
  };
};

// ============================================
// WEAR RING CLEARANCE SPECIFICATIONS
// ============================================

export interface WearRingClearance {
  diameterRangeMm: { min: number; max: number };
  newClearanceMm: { min: number; max: number };
  maxAllowedClearanceMm: number;
  notes: string;
}

export const API_610_WEAR_RING_CLEARANCES: WearRingClearance[] = [
  {
    diameterRangeMm: { min: 0, max: 50 },
    newClearanceMm: { min: 0.15, max: 0.2 },
    maxAllowedClearanceMm: 0.5,
    notes: "Small pumps - tight clearances critical",
  },
  {
    diameterRangeMm: { min: 50, max: 65 },
    newClearanceMm: { min: 0.2, max: 0.25 },
    maxAllowedClearanceMm: 0.55,
    notes: "Standard clearance range",
  },
  {
    diameterRangeMm: { min: 65, max: 80 },
    newClearanceMm: { min: 0.25, max: 0.3 },
    maxAllowedClearanceMm: 0.6,
    notes: "Standard clearance range",
  },
  {
    diameterRangeMm: { min: 80, max: 100 },
    newClearanceMm: { min: 0.28, max: 0.33 },
    maxAllowedClearanceMm: 0.65,
    notes: "Standard clearance range",
  },
  {
    diameterRangeMm: { min: 100, max: 125 },
    newClearanceMm: { min: 0.3, max: 0.38 },
    maxAllowedClearanceMm: 0.75,
    notes: "Medium pumps",
  },
  {
    diameterRangeMm: { min: 125, max: 150 },
    newClearanceMm: { min: 0.35, max: 0.43 },
    maxAllowedClearanceMm: 0.85,
    notes: "Medium pumps",
  },
  {
    diameterRangeMm: { min: 150, max: 200 },
    newClearanceMm: { min: 0.4, max: 0.5 },
    maxAllowedClearanceMm: 1.0,
    notes: "Larger pumps",
  },
  {
    diameterRangeMm: { min: 200, max: 250 },
    newClearanceMm: { min: 0.45, max: 0.55 },
    maxAllowedClearanceMm: 1.1,
    notes: "Larger pumps",
  },
  {
    diameterRangeMm: { min: 250, max: 300 },
    newClearanceMm: { min: 0.5, max: 0.6 },
    maxAllowedClearanceMm: 1.2,
    notes: "Large pumps",
  },
  {
    diameterRangeMm: { min: 300, max: 400 },
    newClearanceMm: { min: 0.55, max: 0.7 },
    maxAllowedClearanceMm: 1.4,
    notes: "Large pumps",
  },
  {
    diameterRangeMm: { min: 400, max: 500 },
    newClearanceMm: { min: 0.65, max: 0.8 },
    maxAllowedClearanceMm: 1.6,
    notes: "Very large pumps",
  },
];

export type WearRingType = "casing" | "impeller" | "floating" | "l_type" | "labyrinth";

export interface WearRingTypeInfo {
  value: WearRingType;
  label: string;
  description: string;
  advantages: string[];
  applications: string[];
}

export const WEAR_RING_TYPES: WearRingTypeInfo[] = [
  {
    value: "casing",
    label: "Casing Wear Ring",
    description: "Stationary ring pressed into casing",
    advantages: ["Easy to replace", "Protects expensive casing", "Most common type"],
    applications: ["Standard centrifugal pumps", "Process pumps"],
  },
  {
    value: "impeller",
    label: "Impeller Wear Ring",
    description: "Ring fitted to impeller hub",
    advantages: ["Protects impeller", "Can be replaced independently"],
    applications: ["High-value impellers", "Specialty materials"],
  },
  {
    value: "floating",
    label: "Floating Wear Ring",
    description: "Self-centering ring that floats between surfaces",
    advantages: ["Self-centering", "Reduces vibration", "Handles minor misalignment"],
    applications: ["Vertical pumps", "High-speed pumps"],
  },
  {
    value: "l_type",
    label: "L-Type Wear Ring",
    description: "L-shaped ring for axial and radial sealing",
    advantages: ["Provides axial thrust balance", "Dual sealing function"],
    applications: ["Multistage pumps", "API 610 pumps"],
  },
  {
    value: "labyrinth",
    label: "Labyrinth Wear Ring",
    description: "Multiple grooves create labyrinth seal",
    advantages: ["Non-contacting", "Handles abrasives", "Longer life"],
    applications: ["Slurry pumps", "Abrasive services", "High temperature"],
  },
];

export const getWearRingClearance = (diameterMm: number): WearRingClearance | undefined =>
  API_610_WEAR_RING_CLEARANCES.find(
    (c) => diameterMm >= c.diameterRangeMm.min && diameterMm < c.diameterRangeMm.max,
  );

export interface WearRingCondition {
  status: "good" | "monitor" | "replace";
  message: string;
  efficiencyLoss: number;
}

export const assessWearRingCondition = (
  diameterMm: number,
  measuredClearanceMm: number,
): WearRingCondition => {
  const spec = getWearRingClearance(diameterMm);
  if (!spec) {
    return {
      status: "monitor",
      message: "Diameter outside standard range - consult OEM",
      efficiencyLoss: 0,
    };
  }

  const newClearanceAvg = (spec.newClearanceMm.min + spec.newClearanceMm.max) / 2;
  const clearanceRatio = measuredClearanceMm / newClearanceAvg;

  if (measuredClearanceMm >= spec.maxAllowedClearanceMm) {
    const effLoss = Math.min(15, (clearanceRatio - 1) * 10);
    return {
      status: "replace",
      message: `Clearance ${measuredClearanceMm}mm exceeds maximum ${spec.maxAllowedClearanceMm}mm - replacement required`,
      efficiencyLoss: Math.round(effLoss * 10) / 10,
    };
  }

  if (clearanceRatio > 1.5) {
    const effLoss = (clearanceRatio - 1) * 5;
    return {
      status: "monitor",
      message: `Clearance ${measuredClearanceMm}mm is worn - monitor closely, plan replacement`,
      efficiencyLoss: Math.round(effLoss * 10) / 10,
    };
  }

  return {
    status: "good",
    message: `Clearance ${measuredClearanceMm}mm is within acceptable range`,
    efficiencyLoss: 0,
  };
};

export const PUMP_SPARE_PARTS: SparePartCategory[] = [
  {
    value: "rotating",
    label: "Rotating Components",
    description: "Impellers, shafts, and rotating assemblies",
    icon: "🔄",
    parts: [
      {
        value: "impeller",
        label: "Impeller",
        description: "Rotating component that imparts energy to the fluid",
        specificationFields: ["diameter", "material", "numberOfVanes", "type"],
      },
      {
        value: "shaft",
        label: "Pump Shaft",
        description: "Connects motor to impeller, transmits torque",
        specificationFields: ["diameter", "length", "material", "keyway"],
      },
      {
        value: "shaft_sleeve",
        label: "Shaft Sleeve",
        description: "Protects shaft in seal/packing area",
        specificationFields: ["od", "id", "length", "material"],
      },
      {
        value: "wear_ring",
        label: "Wear Ring",
        description: "Replaceable clearance ring between impeller and casing",
        specificationFields: ["type", "od", "id", "material"],
      },
      {
        value: "inducer",
        label: "Inducer",
        description: "Pre-rotation device for low NPSH applications",
        specificationFields: ["diameter", "material"],
      },
    ],
  },
  {
    value: "sealing",
    label: "Sealing Components",
    description: "Mechanical seals, packing, and gaskets",
    icon: "🔒",
    parts: [
      {
        value: "mechanical_seal",
        label: "Mechanical Seal",
        description: "Complete mechanical seal assembly",
        specificationFields: ["shaftSize", "sealType", "materials", "apiPlan"],
      },
      {
        value: "seal_faces",
        label: "Seal Faces",
        description: "Rotating and stationary seal face pair",
        specificationFields: ["size", "rotatingMaterial", "stationaryMaterial"],
      },
      {
        value: "seal_elastomers",
        label: "Seal O-Rings/Elastomers",
        description: "Secondary sealing elements",
        specificationFields: ["material", "size"],
      },
      {
        value: "seal_springs",
        label: "Seal Springs",
        description: "Springs for mechanical seal compression",
        specificationFields: ["type", "material", "quantity"],
      },
      {
        value: "gland_packing",
        label: "Gland Packing",
        description: "Compression packing for stuffing box",
        specificationFields: ["size", "material", "quantity"],
      },
      {
        value: "lantern_ring",
        label: "Lantern Ring",
        description: "Spacer ring for flush water injection",
        specificationFields: ["size", "material"],
      },
      {
        value: "gasket_set",
        label: "Gasket Set",
        description: "Complete set of pump gaskets",
        specificationFields: ["material", "pumpModel"],
      },
    ],
  },
  {
    value: "bearings",
    label: "Bearings & Supports",
    description: "Bearings, bearing housings, and support components",
    icon: "⚙️",
    parts: [
      {
        value: "radial_bearing",
        label: "Radial Bearing",
        description: "Supports radial loads on shaft",
        specificationFields: ["type", "size", "manufacturer"],
      },
      {
        value: "thrust_bearing",
        label: "Thrust Bearing",
        description: "Supports axial loads on shaft",
        specificationFields: ["type", "size", "manufacturer"],
      },
      {
        value: "bearing_housing",
        label: "Bearing Housing",
        description: "Enclosure for bearing assembly",
        specificationFields: ["type", "material"],
      },
      {
        value: "bearing_isolator",
        label: "Bearing Isolator",
        description: "Protects bearings from contamination",
        specificationFields: ["shaftSize", "type"],
      },
      {
        value: "oil_seal",
        label: "Oil Seal / Lip Seal",
        description: "Seals bearing oil/grease",
        specificationFields: ["size", "material"],
      },
    ],
  },
  {
    value: "casing",
    label: "Casing & Wear Parts",
    description: "Casing components and wear parts",
    icon: "🛡️",
    parts: [
      {
        value: "volute_casing",
        label: "Volute/Casing",
        description: "Main pump body",
        specificationFields: ["material", "size"],
      },
      {
        value: "back_plate",
        label: "Back Plate / Cover",
        description: "Rear casing component",
        specificationFields: ["material"],
      },
      {
        value: "suction_cover",
        label: "Suction Cover",
        description: "Front casing component with suction nozzle",
        specificationFields: ["material"],
      },
      {
        value: "liner",
        label: "Casing Liner",
        description: "Replaceable wear liner for slurry pumps",
        specificationFields: ["material", "type"],
      },
      {
        value: "throatbush",
        label: "Throatbush",
        description: "Wear component at impeller inlet",
        specificationFields: ["material"],
      },
      {
        value: "expeller",
        label: "Expeller / Repeller",
        description: "Back vanes to reduce seal pressure",
        specificationFields: ["diameter", "material"],
      },
    ],
  },
  {
    value: "coupling",
    label: "Coupling & Drive",
    description: "Couplings and drive components",
    icon: "🔗",
    parts: [
      {
        value: "coupling_complete",
        label: "Coupling Assembly",
        description: "Complete coupling unit",
        specificationFields: ["type", "size", "manufacturer"],
      },
      {
        value: "coupling_element",
        label: "Coupling Element",
        description: "Flexible element for coupling",
        specificationFields: ["type", "size"],
      },
      {
        value: "coupling_hub",
        label: "Coupling Hub",
        description: "Hub portion of coupling",
        specificationFields: ["boreSize", "type"],
      },
      {
        value: "coupling_spacer",
        label: "Coupling Spacer",
        description: "Spacer for seal removal",
        specificationFields: ["length", "type"],
      },
      {
        value: "coupling_guard",
        label: "Coupling Guard",
        description: "Safety guard over coupling",
        specificationFields: ["type", "material"],
      },
    ],
  },
  {
    value: "auxiliary",
    label: "Auxiliary Components",
    description: "Supporting equipment and accessories",
    icon: "🔧",
    parts: [
      {
        value: "baseplate",
        label: "Baseplate",
        description: "Mounting frame for pump and motor",
        specificationFields: ["type", "material", "size"],
      },
      {
        value: "strainer",
        label: "Suction Strainer",
        description: "Inlet strainer to protect pump",
        specificationFields: ["size", "meshSize", "material"],
      },
      {
        value: "seal_pot",
        label: "Seal Support System",
        description: "Reservoir for seal flush system",
        specificationFields: ["type", "capacity"],
      },
      {
        value: "pressure_gauge",
        label: "Pressure Gauge",
        description: "Suction/discharge pressure indication",
        specificationFields: ["range", "connection"],
      },
      {
        value: "relief_valve",
        label: "Relief Valve",
        description: "Overpressure protection",
        specificationFields: ["setPoint", "size"],
      },
    ],
  },
];

export const getSparePartCategory = (categoryValue: string): SparePartCategory | undefined =>
  PUMP_SPARE_PARTS.find((cat) => cat.value === categoryValue);

export const getAllSpareParts = (): SparePart[] => PUMP_SPARE_PARTS.flatMap((cat) => cat.parts);

export const getSparePartByValue = (value: string): SparePart | undefined =>
  getAllSpareParts().find((part) => part.value === value);

// Common Spare Parts Kits
export const SPARE_PARTS_KITS = [
  {
    value: "wear_and_tear",
    label: "Wear & Tear Kit",
    description: "Basic wear parts for routine maintenance",
    typicalParts: ["mechanical_seal", "gasket_set", "wear_ring", "bearing_isolator"],
  },
  {
    value: "major_overhaul",
    label: "Major Overhaul Kit",
    description: "Complete rebuild kit",
    typicalParts: [
      "impeller",
      "shaft_sleeve",
      "mechanical_seal",
      "wear_ring",
      "radial_bearing",
      "thrust_bearing",
      "gasket_set",
    ],
  },
  {
    value: "seal_kit",
    label: "Seal Repair Kit",
    description: "Mechanical seal components",
    typicalParts: ["seal_faces", "seal_elastomers", "seal_springs"],
  },
  {
    value: "bearing_kit",
    label: "Bearing Kit",
    description: "Complete bearing replacement set",
    typicalParts: ["radial_bearing", "thrust_bearing", "bearing_isolator", "oil_seal"],
  },
];
