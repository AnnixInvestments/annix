import type { GlobalSpecs } from "@/app/lib/hooks/useRfqForm";

export type FeatureType = "coating-assistant" | "lining-assistant";

export interface SurfaceProtectionSectionProps {
  globalSpecs: GlobalSpecs;
  onUpdateGlobalSpecs: (specs: GlobalSpecs) => void;
  isUnregisteredCustomer: boolean;
  showFeatureRestrictionPopup: (feature: FeatureType) => (e: React.MouseEvent) => void;
}

export interface ExternalCoatingSectionProps {
  globalSpecs: GlobalSpecs;
  onUpdateGlobalSpecs: (specs: GlobalSpecs) => void;
  isUnregisteredCustomer: boolean;
  showFeatureRestrictionPopup: (feature: FeatureType) => (e: React.MouseEvent) => void;
  effectiveInstallationType: string | undefined;
  effectiveUvExposure: string | undefined;
  effectiveMechanicalRisk: string | undefined;
  effectiveIso12944: string | undefined;
  effectiveMarineInfluence: string | undefined;
  effectiveIndustrialPollution: string | undefined;
  effectiveEcpTemperature: string | undefined;
  isInstallationTypeAutoFilled: boolean;
  isUvExposureAutoFilled: boolean;
  isMechanicalRiskAutoFilled: boolean;
  isIso12944AutoFilled: boolean;
  isMarineInfluenceAutoFilled: boolean;
  isIndustrialPollutionAutoFilled: boolean;
  isEcpTemperatureAutoFilled: boolean;
}

export interface InternalLiningSectionProps {
  globalSpecs: GlobalSpecs;
  onUpdateGlobalSpecs: (specs: GlobalSpecs) => void;
  isUnregisteredCustomer: boolean;
  showFeatureRestrictionPopup: (feature: FeatureType) => (e: React.MouseEvent) => void;
}

export interface SubstrateType {
  id: string;
  name: string;
  description: string;
  surfacePrepNotes: string[];
}

export interface ApplicationMethod {
  id: string;
  name: string;
  description: string;
  suitableFor: string[];
  dftRange: string;
}

export interface InspectionRequirement {
  id: string;
  name: string;
  description: string;
  standard: string;
  frequency: string;
}

export interface EnvironmentalCondition {
  temperature: number;
  humidity: number;
  dewPoint: number;
  steelTemperature: number;
  isWithinLimits: boolean;
  warnings: string[];
}

export const SUBSTRATE_TYPES: SubstrateType[] = [
  {
    id: "carbon-steel",
    name: "Carbon Steel",
    description: "Standard carbon steel (A106, SABS 62, etc.)",
    surfacePrepNotes: [
      "Blast clean to Sa 2.5 minimum",
      "Surface profile 40-75 microns",
      "Remove all mill scale, rust, and contaminants",
    ],
  },
  {
    id: "stainless-steel",
    name: "Stainless Steel",
    description: "Austenitic stainless steel (304, 316, etc.)",
    surfacePrepNotes: [
      "Degrease thoroughly",
      "Light abrasive blast or sweep blast",
      "Use chloride-free cleaning agents",
    ],
  },
  {
    id: "galvanized",
    name: "Galvanized Steel",
    description: "Hot-dip galvanized steel",
    surfacePrepNotes: [
      "T-wash or etch primer treatment",
      "Light sweep blast if weathered",
      "Remove zinc salts (white rust)",
    ],
  },
  {
    id: "aluminum",
    name: "Aluminum",
    description: "Aluminum alloys",
    surfacePrepNotes: [
      "Chromate conversion coating",
      "Etch primer recommended",
      "Avoid contamination with iron particles",
    ],
  },
  {
    id: "concrete",
    name: "Concrete/Cement",
    description: "Concrete or cement surfaces",
    surfacePrepNotes: [
      "Minimum 28 days cure",
      "Moisture content <5%",
      "Remove laitance by grinding or blasting",
    ],
  },
];

export const APPLICATION_METHODS: ApplicationMethod[] = [
  {
    id: "airless-spray",
    name: "Airless Spray",
    description: "High-pressure airless spray application",
    suitableFor: ["Large areas", "Heavy-build coatings", "Production environments"],
    dftRange: "High DFT achievable (up to 500μm per coat)",
  },
  {
    id: "conventional-spray",
    name: "Conventional Spray",
    description: "Air atomized spray application",
    suitableFor: ["Detailed work", "Touch-up", "Thin film coatings"],
    dftRange: "Lower DFT per coat (25-75μm typical)",
  },
  {
    id: "brush",
    name: "Brush Application",
    description: "Manual brush application",
    suitableFor: ["Stripe coating", "Small areas", "Touch-up", "Welds and edges"],
    dftRange: "Variable DFT, multiple coats often needed",
  },
  {
    id: "roller",
    name: "Roller Application",
    description: "Manual roller application",
    suitableFor: ["Flat surfaces", "Floors", "Tank internals"],
    dftRange: "Moderate DFT (50-150μm typical)",
  },
  {
    id: "hot-dip",
    name: "Hot-Dip Galvanizing",
    description: "Factory hot-dip galvanizing process",
    suitableFor: ["Structural steel", "Complete immersion items"],
    dftRange: "45-85μm depending on steel thickness",
  },
  {
    id: "electrostatic",
    name: "Electrostatic Spray",
    description: "Electrostatic powder or liquid spray",
    suitableFor: ["Complex shapes", "High transfer efficiency needed"],
    dftRange: "50-100μm typical for powder coating",
  },
];

export const INSPECTION_REQUIREMENTS: InspectionRequirement[] = [
  {
    id: "dft-check",
    name: "Dry Film Thickness",
    description: "Measure coating thickness with magnetic or eddy current gauge",
    standard: "ISO 2808 / SSPC-PA 2",
    frequency: "Per coat, minimum 5 readings per m²",
  },
  {
    id: "adhesion-test",
    name: "Adhesion Test",
    description: "Cross-cut or pull-off adhesion testing",
    standard: "ISO 2409 / ASTM D4541",
    frequency: "Per batch or as specified",
  },
  {
    id: "holiday-detection",
    name: "Holiday Detection",
    description: "Detect pinholes and discontinuities in coating",
    standard: "NACE SP0188 / ISO 29601",
    frequency: "100% of coated surface",
  },
  {
    id: "surface-profile",
    name: "Surface Profile",
    description: "Measure blast profile depth",
    standard: "ISO 8503 / NACE SP0287",
    frequency: "Per surface preparation area",
  },
  {
    id: "dust-contamination",
    name: "Dust Contamination",
    description: "Assess dust quantity and size on prepared surface",
    standard: "ISO 8502-3",
    frequency: "Before coating application",
  },
  {
    id: "salt-contamination",
    name: "Soluble Salt Testing",
    description: "Measure chloride/sulfate contamination",
    standard: "ISO 8502-6 / ISO 8502-9",
    frequency: "Before coating application",
  },
];

export interface ProductCatalogItem {
  id: string;
  name: string;
  supplier: string;
  type: "paint" | "rubber" | "ceramic";
  category: string;
  description: string;
  maxTempC: number;
  chemicalResistance: "poor" | "fair" | "good" | "excellent";
  abrasionResistance: "poor" | "fair" | "good" | "excellent";
  priceCategory: "economy" | "standard" | "premium";
}

export interface SystemComparison {
  systems: Array<{
    name: string;
    totalDft: number;
    estimatedCostPerM2: string;
    durabilityYears: string;
    maintenance: string;
    pros: string[];
    cons: string[];
  }>;
}

export interface SurfaceAreaInput {
  nominalBoreMm: number;
  lengthMm: number;
  quantity: number;
  includeInternal: boolean;
  includeExternal: boolean;
}

export interface QuantityTakeoff {
  paintLiters: number;
  rubberSheetM2: number;
  ceramicTilesCount: number;
  adhesiveKg: number;
  surfaceAreaM2: {
    internal: number;
    external: number;
    total: number;
  };
}
