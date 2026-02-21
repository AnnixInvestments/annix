import type { CorrosivityCategory, GenericType, PaintProduct } from "./paintProducts";
import { paintProducts, productsForCorrosivity, productsForTemperature } from "./paintProducts";

export type ISO12944Durability = "L" | "M" | "H" | "VH";

export type NORSOKSystemNumber = "1" | "2" | "3" | "3A" | "3B" | "4" | "5" | "6" | "7" | "8" | "9";

export type SurfacePrepStandard = {
  iso8501: string;
  sspcSp: string;
  nace: string;
  description: string;
};

export interface ISO12944Environment {
  corrosivityCategory: CorrosivityCategory;
  immersionType?: "freshwater" | "seawater" | "soil" | "none";
  expectedServiceLife: ISO12944Durability;
}

export interface ISO12944DurabilityResult {
  durability: ISO12944Durability;
  yearsRange: { min: number; max: number };
  minimumDftUm: number;
  recommendedCoats: number;
  maintenanceInterval: string;
}

export interface NORSOKSystem {
  systemNumber: number;
  name: string;
  application: string;
  surfacePrep: SurfacePrepStandard;
  primer: { genericType: GenericType; dftUm: { min: number; max: number } };
  intermediate: { genericType: GenericType; dftUm: { min: number; max: number } } | null;
  topcoat: { genericType: GenericType; dftUm: { min: number; max: number } } | null;
  totalDftUm: { min: number; max: number };
  testRequirements: string[];
}

export interface CureScheduleInput {
  product: PaintProduct;
  ambientTempC: number;
  relativeHumidityPercent: number;
  airflowCondition: "still" | "moderate" | "good";
}

export interface CureScheduleResult {
  touchDryHours: number;
  overcoatMinHours: number;
  overcoatMaxHours: number | null;
  fullCureDays: number;
  warnings: string[];
}

export interface CoverageCalculation {
  product: PaintProduct;
  surfaceAreaM2: number;
  targetDftUm: number;
  lossFactor: number;
}

export interface CoverageResult {
  theoreticalCoverageM2PerL: number;
  practicalCoverageM2PerL: number;
  volumeRequiredL: number;
  volumeWithWasteL: number;
  numberOfCoats: number;
  notes: string[];
}

export interface CompatibilityValidation {
  isCompatible: boolean;
  issues: string[];
  warnings: string[];
}

export interface OvercoatWindow {
  product: PaintProduct;
  previousCoatAgeHours: number;
  ambientTempC: number;
}

export interface OvercoatWindowResult {
  canOvercoat: boolean;
  status: "too-early" | "within-window" | "exceeded-recoat" | "requires-abrasion";
  message: string;
  recommendations: string[];
}

export interface CoatingSystemRequirements {
  corrosivityCategory: CorrosivityCategory;
  operatingTempC?: number;
  surfaceTolerant?: boolean;
  immersionService?: boolean;
  uvExposure?: boolean;
}

export interface RecommendedCoatingSystem {
  primer: PaintProduct | null;
  intermediate: PaintProduct | null;
  topcoat: PaintProduct | null;
  totalDftRange: { minUm: number; maxUm: number };
  numberOfCoats: number;
  systemDescription: string;
  alternativePrimers: PaintProduct[];
  alternativeTopcoats: PaintProduct[];
}

function isCompatibleSequence(primer: PaintProduct, next: PaintProduct): boolean {
  return primer.compatibleSubsequentCoats.includes(next.genericType);
}

function filterByTemperature(
  products: PaintProduct[],
  tempC: number | undefined,
): PaintProduct[] {
  if (tempC === undefined || tempC === null) return products;
  return products.filter((p) => p.heatResistance.continuousC >= tempC);
}

function filterBySurfaceTolerance(
  products: PaintProduct[],
  required: boolean | undefined,
): PaintProduct[] {
  if (!required) return products;
  return products.filter((p) => p.surfaceTolerant);
}

function findPrimers(
  category: CorrosivityCategory,
  tempC?: number,
  surfaceTolerant?: boolean,
): PaintProduct[] {
  const suitableProducts = productsForCorrosivity(category);
  const primers = suitableProducts.filter(
    (p) => p.productRole === "primer" || p.productRole === "multi-purpose",
  );
  const tempFiltered = filterByTemperature(primers, tempC);
  return filterBySurfaceTolerance(tempFiltered, surfaceTolerant);
}

function findIntermediates(
  category: CorrosivityCategory,
  primer: PaintProduct,
  tempC?: number,
): PaintProduct[] {
  const suitableProducts = productsForCorrosivity(category);
  const intermediates = suitableProducts.filter(
    (p) =>
      p.productRole === "intermediate" ||
      (p.productRole === "multi-purpose" && p.id !== primer.id),
  );
  const compatible = intermediates.filter((p) => isCompatibleSequence(primer, p));
  return filterByTemperature(compatible, tempC);
}

function findTopcoats(
  category: CorrosivityCategory,
  previousCoat: PaintProduct,
  tempC?: number,
  uvExposure?: boolean,
): PaintProduct[] {
  const suitableProducts = productsForCorrosivity(category);
  const topcoats = suitableProducts.filter(
    (p) => p.productRole === "topcoat" || p.productRole === "multi-purpose",
  );
  const compatible = topcoats.filter((p) => isCompatibleSequence(previousCoat, p));
  const tempFiltered = filterByTemperature(compatible, tempC);

  if (uvExposure) {
    const uvResistant = tempFiltered.filter(
      (p) => p.genericType === "polyurethane" || p.genericType === "polysiloxane",
    );
    if (uvResistant.length > 0) return uvResistant;
  }
  return tempFiltered;
}

function sortByPreference(products: PaintProduct[]): PaintProduct[] {
  return [...products].sort((a, b) => {
    const typeOrder: Record<GenericType, number> = {
      "zinc-silicate": 1,
      "zinc-rich-epoxy": 2,
      epoxy: 3,
      "epoxy-mio": 4,
      "epoxy-mastic": 5,
      "epoxy-phenolic": 6,
      "epoxy-glass-flake": 7,
      polyurethane: 8,
      polysiloxane: 9,
      polyurea: 10,
      acrylic: 11,
      alkyd: 12,
      vinyl: 13,
      "high-temp-silicone": 14,
      intumescent: 15,
      fbe: 16,
      "3lpe": 17,
    };
    return (typeOrder[a.genericType] || 99) - (typeOrder[b.genericType] || 99);
  });
}

export function recommendCoatingSystem(
  requirements: CoatingSystemRequirements,
): RecommendedCoatingSystem {
  const { corrosivityCategory, operatingTempC, surfaceTolerant, uvExposure } = requirements;

  const primers = sortByPreference(findPrimers(corrosivityCategory, operatingTempC, surfaceTolerant));
  const primer = primers[0] || null;

  if (!primer) {
    return {
      primer: null,
      intermediate: null,
      topcoat: null,
      totalDftRange: { minUm: 0, maxUm: 0 },
      numberOfCoats: 0,
      systemDescription: "No suitable products found for the specified requirements",
      alternativePrimers: [],
      alternativeTopcoats: [],
    };
  }

  const intermediates = sortByPreference(findIntermediates(corrosivityCategory, primer, operatingTempC));
  const intermediate = intermediates[0] || null;

  const lastCoatBeforeTopcoat = intermediate || primer;
  const topcoats = sortByPreference(
    findTopcoats(corrosivityCategory, lastCoatBeforeTopcoat, operatingTempC, uvExposure),
  );
  const topcoat = topcoats.find((t) => t.id !== primer.id && t.id !== intermediate?.id) || null;

  const components = [primer, intermediate, topcoat].filter(Boolean) as PaintProduct[];
  const totalDftRange = components.reduce(
    (acc, p) => ({
      minUm: acc.minUm + p.dft.minUm,
      maxUm: acc.maxUm + p.dft.maxUm,
    }),
    { minUm: 0, maxUm: 0 },
  );

  const systemParts = components.map((p) => `${p.supplier} ${p.name}`);
  const systemDescription = systemParts.join(" + ");

  return {
    primer,
    intermediate,
    topcoat,
    totalDftRange,
    numberOfCoats: components.length,
    systemDescription,
    alternativePrimers: primers.slice(1, 4),
    alternativeTopcoats: topcoats.filter((t) => t.id !== topcoat?.id).slice(0, 3),
  };
}

export function recommendPrimersForCategory(category: CorrosivityCategory): PaintProduct[] {
  return sortByPreference(findPrimers(category));
}

export function recommendTopcoatsForPrimer(
  primer: PaintProduct,
  uvExposure?: boolean,
): PaintProduct[] {
  const compatible = paintProducts.filter(
    (p) =>
      (p.productRole === "topcoat" || p.productRole === "multi-purpose") &&
      isCompatibleSequence(primer, p),
  );
  if (uvExposure) {
    const uvResistant = compatible.filter(
      (p) => p.genericType === "polyurethane" || p.genericType === "polysiloxane",
    );
    if (uvResistant.length > 0) return sortByPreference(uvResistant);
  }
  return sortByPreference(compatible);
}

export function systemDftSummary(system: RecommendedCoatingSystem): string {
  const parts: string[] = [];
  if (system.primer) {
    parts.push(`Primer: ${system.primer.dft.typicalUm}μm`);
  }
  if (system.intermediate) {
    parts.push(`Intermediate: ${system.intermediate.dft.typicalUm}μm`);
  }
  if (system.topcoat) {
    parts.push(`Topcoat: ${system.topcoat.dft.typicalUm}μm`);
  }
  const total = `Total: ${system.totalDftRange.minUm}-${system.totalDftRange.maxUm}μm`;
  return [...parts, total].join(", ");
}

export function highTempSystemRecommendation(
  continuousTempC: number,
): RecommendedCoatingSystem | null {
  const highTempProducts = productsForTemperature(continuousTempC);
  const primers = highTempProducts.filter(
    (p) => p.productRole === "primer" || p.productRole === "multi-purpose",
  );

  if (primers.length === 0) return null;

  const sortedPrimers = sortByPreference(primers);
  const primer = sortedPrimers[0];

  const topcoats = highTempProducts.filter(
    (p) =>
      (p.productRole === "topcoat" || p.productRole === "multi-purpose") &&
      isCompatibleSequence(primer, p) &&
      p.id !== primer.id,
  );

  const topcoat = topcoats[0] || null;
  const components = [primer, topcoat].filter(Boolean) as PaintProduct[];

  return {
    primer,
    intermediate: null,
    topcoat,
    totalDftRange: components.reduce(
      (acc, p) => ({ minUm: acc.minUm + p.dft.minUm, maxUm: acc.maxUm + p.dft.maxUm }),
      { minUm: 0, maxUm: 0 },
    ),
    numberOfCoats: components.length,
    systemDescription: components.map((p) => `${p.supplier} ${p.name}`).join(" + "),
    alternativePrimers: sortedPrimers.slice(1, 4),
    alternativeTopcoats: topcoats.slice(1, 4),
  };
}

const SURFACE_PREP_STANDARDS: Record<string, SurfacePrepStandard> = {
  "Sa 3": {
    iso8501: "Sa 3",
    sspcSp: "SP 5",
    nace: "NACE No. 1",
    description: "White metal blast cleaning - complete removal of all rust, mill scale, and coatings",
  },
  "Sa 2.5": {
    iso8501: "Sa 2½",
    sspcSp: "SP 10",
    nace: "NACE No. 2",
    description: "Near-white metal blast cleaning - at least 95% of surface free of visible residue",
  },
  "Sa 2": {
    iso8501: "Sa 2",
    sspcSp: "SP 6",
    nace: "NACE No. 3",
    description: "Commercial blast cleaning - at least 67% of surface free of visible residue",
  },
  "Sa 1": {
    iso8501: "Sa 1",
    sspcSp: "SP 7",
    nace: "NACE No. 4",
    description: "Light blast cleaning - loose mill scale, rust, and coatings removed",
  },
  "St 3": {
    iso8501: "St 3",
    sspcSp: "SP 3",
    nace: "N/A",
    description: "Very thorough hand and power tool cleaning",
  },
  "St 2": {
    iso8501: "St 2",
    sspcSp: "SP 2",
    nace: "N/A",
    description: "Thorough hand and power tool cleaning",
  },
};

const NORSOK_SYSTEMS: NORSOKSystem[] = [
  {
    systemNumber: 1,
    name: "System 1 - Zinc Epoxy + Epoxy + PU",
    application: "Atmospheric, C5-M, offshore topsides",
    surfacePrep: SURFACE_PREP_STANDARDS["Sa 2.5"],
    primer: { genericType: "zinc-rich-epoxy", dftUm: { min: 50, max: 80 } },
    intermediate: { genericType: "epoxy", dftUm: { min: 150, max: 200 } },
    topcoat: { genericType: "polyurethane", dftUm: { min: 50, max: 80 } },
    totalDftUm: { min: 280, max: 360 },
    testRequirements: ["ISO 20340", "NORSOK M-501 Ed.6 Table 1"],
  },
  {
    systemNumber: 2,
    name: "System 2 - Zinc Silicate + Epoxy + PU",
    application: "Atmospheric, C5-M, offshore topsides (inorganic primer)",
    surfacePrep: SURFACE_PREP_STANDARDS["Sa 2.5"],
    primer: { genericType: "zinc-silicate", dftUm: { min: 60, max: 80 } },
    intermediate: { genericType: "epoxy", dftUm: { min: 150, max: 200 } },
    topcoat: { genericType: "polyurethane", dftUm: { min: 50, max: 80 } },
    totalDftUm: { min: 280, max: 360 },
    testRequirements: ["ISO 20340", "NORSOK M-501 Ed.6 Table 1"],
  },
  {
    systemNumber: 3,
    name: "System 3A/3B - High-Build Epoxy",
    application: "Submerged/buried, seawater immersion, ballast tanks",
    surfacePrep: SURFACE_PREP_STANDARDS["Sa 2.5"],
    primer: { genericType: "epoxy", dftUm: { min: 300, max: 450 } },
    intermediate: null,
    topcoat: null,
    totalDftUm: { min: 300, max: 450 },
    testRequirements: ["ISO 20340", "IMO PSPC", "NORSOK M-501 Ed.6 Table 2"],
  },
  {
    systemNumber: 4,
    name: "System 4 - Epoxy (Non-Immersion)",
    application: "Internal dry spaces, non-corrosive",
    surfacePrep: SURFACE_PREP_STANDARDS["Sa 2"],
    primer: { genericType: "epoxy", dftUm: { min: 100, max: 150 } },
    intermediate: null,
    topcoat: null,
    totalDftUm: { min: 100, max: 150 },
    testRequirements: ["NORSOK M-501 Ed.6 Table 3"],
  },
  {
    systemNumber: 5,
    name: "System 5 - High-Temp Silicone",
    application: "High temperature surfaces >150°C",
    surfacePrep: SURFACE_PREP_STANDARDS["Sa 2.5"],
    primer: { genericType: "high-temp-silicone", dftUm: { min: 50, max: 75 } },
    intermediate: null,
    topcoat: null,
    totalDftUm: { min: 50, max: 75 },
    testRequirements: ["ISO 20340 (modified)", "NORSOK M-501 Ed.6 Table 4"],
  },
  {
    systemNumber: 7,
    name: "System 7 - Glass Flake Epoxy",
    application: "Splash zone, severe mechanical damage risk",
    surfacePrep: SURFACE_PREP_STANDARDS["Sa 2.5"],
    primer: { genericType: "epoxy-glass-flake", dftUm: { min: 500, max: 1000 } },
    intermediate: null,
    topcoat: null,
    totalDftUm: { min: 500, max: 1000 },
    testRequirements: ["ISO 20340", "NORSOK M-501 Ed.6 Table 5"],
  },
];

export function generateNORSOKSystem(
  systemNumber: number,
  products?: PaintProduct[],
): NORSOKSystem & { matchedProducts: PaintProduct[] } {
  const system = NORSOK_SYSTEMS.find((s) => s.systemNumber === systemNumber);
  if (!system) {
    throw new Error(`NORSOK System ${systemNumber} not found`);
  }

  const availableProducts = products || paintProducts;
  const matchedProducts: PaintProduct[] = [];

  const primerMatch = availableProducts.find(
    (p) =>
      p.genericType === system.primer.genericType &&
      (p.productRole === "primer" || p.productRole === "multi-purpose") &&
      p.approvals.some((a) => a.toLowerCase().includes("norsok")),
  );
  if (primerMatch) matchedProducts.push(primerMatch);

  if (system.intermediate) {
    const intermediateMatch = availableProducts.find(
      (p) =>
        p.genericType === system.intermediate!.genericType &&
        (p.productRole === "intermediate" || p.productRole === "multi-purpose"),
    );
    if (intermediateMatch) matchedProducts.push(intermediateMatch);
  }

  if (system.topcoat) {
    const topcoatMatch = availableProducts.find(
      (p) =>
        p.genericType === system.topcoat!.genericType &&
        (p.productRole === "topcoat" || p.productRole === "multi-purpose"),
    );
    if (topcoatMatch) matchedProducts.push(topcoatMatch);
  }

  return { ...system, matchedProducts };
}

export function allNORSOKSystems(): NORSOKSystem[] {
  return NORSOK_SYSTEMS;
}

export function calculateISO12944Durability(
  environment: ISO12944Environment,
): ISO12944DurabilityResult {
  const { corrosivityCategory, expectedServiceLife, immersionType } = environment;

  const durabilityYears: Record<ISO12944Durability, { min: number; max: number }> = {
    L: { min: 2, max: 5 },
    M: { min: 5, max: 15 },
    H: { min: 15, max: 25 },
    VH: { min: 25, max: 100 },
  };

  const minimumDftByCategory: Record<CorrosivityCategory, Record<ISO12944Durability, number>> = {
    C1: { L: 80, M: 120, H: 160, VH: 200 },
    C2: { L: 120, M: 160, H: 200, VH: 280 },
    C3: { L: 160, M: 200, H: 280, VH: 320 },
    C4: { L: 200, M: 280, H: 320, VH: 400 },
    C5: { L: 280, M: 320, H: 400, VH: 500 },
    CX: { L: 320, M: 400, H: 500, VH: 600 },
  };

  const immersionBonus = immersionType && immersionType !== "none" ? 100 : 0;
  const minimumDft = minimumDftByCategory[corrosivityCategory][expectedServiceLife] + immersionBonus;

  const coatsForDft = (dft: number): number => {
    if (dft <= 160) return 2;
    if (dft <= 320) return 3;
    if (dft <= 500) return 4;
    return 5;
  };

  const maintenanceByDurability: Record<ISO12944Durability, string> = {
    L: "2-5 years",
    M: "5-10 years",
    H: "10-15 years",
    VH: "15-25 years (touch-up only)",
  };

  return {
    durability: expectedServiceLife,
    yearsRange: durabilityYears[expectedServiceLife],
    minimumDftUm: minimumDft,
    recommendedCoats: coatsForDft(minimumDft),
    maintenanceInterval: maintenanceByDurability[expectedServiceLife],
  };
}

export function mapSurfacePrepStandards(iso8501Grade: string): SurfacePrepStandard | null {
  return SURFACE_PREP_STANDARDS[iso8501Grade] || null;
}

export function allSurfacePrepStandards(): SurfacePrepStandard[] {
  return Object.values(SURFACE_PREP_STANDARDS);
}

export function surfacePrepForCorrosivity(category: CorrosivityCategory): SurfacePrepStandard {
  const prepByCategory: Record<CorrosivityCategory, string> = {
    C1: "St 2",
    C2: "St 3",
    C3: "Sa 2",
    C4: "Sa 2.5",
    C5: "Sa 2.5",
    CX: "Sa 3",
  };
  return SURFACE_PREP_STANDARDS[prepByCategory[category]];
}

export function calculateCureSchedule(input: CureScheduleInput): CureScheduleResult {
  const { product, ambientTempC, relativeHumidityPercent, airflowCondition } = input;
  const warnings: string[] = [];

  const baseTouchDry = product.curingAt23C.touchDryHours;
  const baseOvercoatMin = product.curingAt23C.overcoatMinHours;
  const baseFullCure = product.curingAt23C.fullCureDays;

  const tempFactor = (targetTemp: number): number => {
    const referenceTempC = 23;
    const diff = referenceTempC - targetTemp;
    if (diff > 0) {
      return Math.pow(2, diff / 10);
    }
    return Math.pow(0.7, Math.abs(diff) / 10);
  };

  const humidityFactor = (rh: number): number => {
    if (rh > 85) return 1.5;
    if (rh > 75) return 1.2;
    if (rh < 40) return 0.9;
    return 1.0;
  };

  const airflowFactor = (condition: "still" | "moderate" | "good"): number => {
    const factors = { still: 1.3, moderate: 1.0, good: 0.85 };
    return factors[condition];
  };

  const tFactor = tempFactor(ambientTempC);
  const hFactor = humidityFactor(relativeHumidityPercent);
  const aFactor = airflowFactor(airflowCondition);

  const combinedFactor = tFactor * hFactor * aFactor;

  if (ambientTempC < product.applicationTemp.minAirC) {
    warnings.push(`Temperature ${ambientTempC}°C is below minimum application temperature ${product.applicationTemp.minAirC}°C`);
  }
  if (ambientTempC > product.applicationTemp.maxAirC) {
    warnings.push(`Temperature ${ambientTempC}°C exceeds maximum application temperature ${product.applicationTemp.maxAirC}°C`);
  }
  if (relativeHumidityPercent > 85) {
    warnings.push("High humidity (>85%) may cause surface defects and extended cure times");
  }
  if (ambientTempC < 10) {
    warnings.push("Low temperature may prevent proper cure - consider heated enclosure");
  }

  const isEpoxy = product.genericType.includes("epoxy");
  const overcoatMaxHours = isEpoxy ? baseOvercoatMin * combinedFactor * 10 : null;

  return {
    touchDryHours: Math.round(baseTouchDry * combinedFactor * 10) / 10,
    overcoatMinHours: Math.round(baseOvercoatMin * combinedFactor * 10) / 10,
    overcoatMaxHours: overcoatMaxHours ? Math.round(overcoatMaxHours) : null,
    fullCureDays: Math.round(baseFullCure * combinedFactor * 10) / 10,
    warnings,
  };
}

export function calculateCoverage(input: CoverageCalculation): CoverageResult {
  const { product, surfaceAreaM2, targetDftUm, lossFactor } = input;
  const notes: string[] = [];

  const theoreticalCoverage = (product.volumeSolidsPercent / 100) * 1000 / targetDftUm;

  const practicalCoverage = theoreticalCoverage * (1 - lossFactor);

  const volumeRequired = surfaceAreaM2 / practicalCoverage;

  const wasteAllowance = 0.1;
  const volumeWithWaste = volumeRequired * (1 + wasteAllowance);

  const coatsNeeded = Math.ceil(targetDftUm / product.dft.maxUm);

  notes.push(`Based on ${product.volumeSolidsPercent}% volume solids`);
  notes.push(`Loss factor ${(lossFactor * 100).toFixed(0)}% applied for application method`);
  notes.push(`Additional 10% waste allowance included`);

  if (targetDftUm > product.dft.maxUm) {
    notes.push(`Target DFT exceeds single coat maximum - ${coatsNeeded} coats required`);
  }

  if (product.spreadingRateM2PerL) {
    notes.push(`Manufacturer stated spreading rate: ${product.spreadingRateM2PerL} m²/L`);
  }

  return {
    theoreticalCoverageM2PerL: Math.round(theoreticalCoverage * 100) / 100,
    practicalCoverageM2PerL: Math.round(practicalCoverage * 100) / 100,
    volumeRequiredL: Math.round(volumeRequired * 10) / 10,
    volumeWithWasteL: Math.round(volumeWithWaste * 10) / 10,
    numberOfCoats: coatsNeeded,
    notes,
  };
}

export function validateMultiCoatCompatibility(
  coats: PaintProduct[],
): CompatibilityValidation {
  const issues: string[] = [];
  const warnings: string[] = [];

  if (coats.length < 2) {
    return { isCompatible: true, issues: [], warnings: ["Single coat system - no compatibility check needed"] };
  }

  for (let i = 0; i < coats.length - 1; i++) {
    const currentCoat = coats[i];
    const nextCoat = coats[i + 1];

    if (!currentCoat.compatibleSubsequentCoats.includes(nextCoat.genericType)) {
      issues.push(
        `${currentCoat.name} (${currentCoat.genericType}) is not compatible with ${nextCoat.name} (${nextCoat.genericType})`
      );
    }

    if (!nextCoat.compatiblePreviousCoats.includes(currentCoat.genericType)) {
      issues.push(
        `${nextCoat.name} cannot be applied over ${currentCoat.genericType}`
      );
    }
  }

  const tempRatings = coats.map((c) => c.heatResistance.continuousC);
  const minTemp = Math.min(...tempRatings);
  const maxTemp = Math.max(...tempRatings);
  if (maxTemp - minTemp > 50) {
    warnings.push(
      `Temperature ratings vary significantly (${minTemp}°C to ${maxTemp}°C) - system limited to ${minTemp}°C`
    );
  }

  const surfaceTolerantPrimer = coats[0].surfaceTolerant;
  if (!surfaceTolerantPrimer && coats[0].productRole === "primer") {
    warnings.push("Primer is not surface tolerant - ensure thorough surface preparation");
  }

  const hasZincPrimer = coats[0].genericType.includes("zinc");
  const hasEpoxyOvercoat = coats.slice(1).some((c) => c.genericType.includes("epoxy"));
  if (hasZincPrimer && !hasEpoxyOvercoat) {
    warnings.push("Zinc primer typically requires epoxy tie-coat before non-epoxy topcoats");
  }

  return {
    isCompatible: issues.length === 0,
    issues,
    warnings,
  };
}

export function checkOvercoatWindow(input: OvercoatWindow): OvercoatWindowResult {
  const { product, previousCoatAgeHours, ambientTempC } = input;

  const tempFactor = Math.pow(2, (23 - ambientTempC) / 10);
  const adjustedMinHours = product.curingAt23C.overcoatMinHours * tempFactor;

  const isEpoxy = product.genericType.includes("epoxy");
  const maxOvercoatHours = isEpoxy ? adjustedMinHours * 14 : null;

  if (previousCoatAgeHours < adjustedMinHours) {
    return {
      canOvercoat: false,
      status: "too-early",
      message: `Too early to overcoat. Wait at least ${Math.round(adjustedMinHours - previousCoatAgeHours)} more hours.`,
      recommendations: [
        `Minimum overcoat time at ${ambientTempC}°C: ${Math.round(adjustedMinHours)} hours`,
        "Ensure coating is tack-free before overcoating",
        "Check for solvent entrapment before proceeding",
      ],
    };
  }

  if (maxOvercoatHours && previousCoatAgeHours > maxOvercoatHours) {
    return {
      canOvercoat: false,
      status: "exceeded-recoat",
      message: "Maximum overcoat window exceeded. Surface preparation required.",
      recommendations: [
        "Abrade surface with 80-120 grit to create mechanical key",
        "Clean surface with appropriate solvent",
        "Apply within 4 hours of surface preparation",
        "Consider applying tie-coat or mist coat",
      ],
    };
  }

  if (maxOvercoatHours && previousCoatAgeHours > maxOvercoatHours * 0.8) {
    return {
      canOvercoat: true,
      status: "within-window",
      message: "Approaching end of overcoat window. Proceed promptly.",
      recommendations: [
        `Approximately ${Math.round(maxOvercoatHours - previousCoatAgeHours)} hours remaining in overcoat window`,
        "Light abrasion recommended if surface appears glossy",
        "Ensure surface is clean and dry",
      ],
    };
  }

  return {
    canOvercoat: true,
    status: "within-window",
    message: "Within optimal overcoat window.",
    recommendations: [
      "Ensure surface is clean and free of contamination",
      `Overcoat window at ${ambientTempC}°C: ${Math.round(adjustedMinHours)} to ${maxOvercoatHours ? Math.round(maxOvercoatHours) : "unlimited"} hours`,
    ],
  };
}
