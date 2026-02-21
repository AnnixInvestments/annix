export type CeramicSupplier =
  | "TITAN Industrial"
  | "HUDCO WearLine"
  | "Multotec"
  | "Ceresist"
  | "HMA Wear Solutions"
  | "Generic";

export type CeramicMaterial =
  | "alumina-92"
  | "alumina-95"
  | "alumina-96"
  | "alumina-99"
  | "zta"
  | "silicon-carbide"
  | "chrome-carbide"
  | "basalt"
  | "tungsten-carbide";

export type TileShape =
  | "square"
  | "rectangular"
  | "hexagonal"
  | "trapezoidal"
  | "curved"
  | "dovetail"
  | "weldable";

export type ApplicationType =
  | "sliding-abrasion"
  | "impact-abrasion"
  | "high-temperature"
  | "chemical-resistant"
  | "general-purpose";

export type ThermalShockResistance = "poor" | "fair" | "good" | "excellent";

export type AdhesiveType =
  | "epoxy"
  | "polyurethane"
  | "ceramic-cement"
  | "sodium-silicate"
  | "rubber-backing";

export interface CeramicProduct {
  id: string;
  name: string;
  supplier: CeramicSupplier;
  material: CeramicMaterial;
  aluminaContentPercent: number;
  zirconiaContentPercent: number | null;
  description: string;
  typicalApplications: string[];
  hardness: {
    rockwellHRA: number | null;
    vickersGPa: number | null;
    mohs: number;
  };
  density: number;
  weightKgPerM2AtTypicalThickness: number | null;
  compressiveStrengthMPa: number;
  flexuralStrengthMPa: number;
  fractureToughnessMPam: number;
  thermalShockResistance: ThermalShockResistance;
  coefficientOfThermalExpansion: number | null;
  maxOperatingTempC: number;
  wearResistanceRating: "standard" | "high" | "very-high" | "extreme";
  impactResistance: "low" | "medium" | "high";
  availableShapes: TileShape[];
  thicknessRange: { minMm: number; maxMm: number };
  compatibleAdhesives: AdhesiveType[];
  groutRequirements: string | null;
  applicationTypes: ApplicationType[];
  features: string[];
}

export const ceramicProducts: CeramicProduct[] = [
  {
    id: "alumina-92-standard",
    name: "92% Alumina Ceramic Tile",
    supplier: "Generic",
    material: "alumina-92",
    aluminaContentPercent: 92,
    zirconiaContentPercent: null,
    description:
      "Standard grade 92% alumina ceramic tile for general wear protection. Good balance of wear resistance and cost-effectiveness.",
    typicalApplications: [
      "Chutes",
      "Hoppers",
      "Conveyor belts",
      "Pipes",
      "Ball mill linings",
      "Powder separation equipment",
    ],
    hardness: { rockwellHRA: 82, vickersGPa: 9, mohs: 9 },
    density: 3.6,
    weightKgPerM2AtTypicalThickness: null,
    compressiveStrengthMPa: 1050,
    flexuralStrengthMPa: 220,
    fractureToughnessMPam: 3.7,
    thermalShockResistance: "fair",
    coefficientOfThermalExpansion: null,
    maxOperatingTempC: 750,
    wearResistanceRating: "high",
    impactResistance: "low",
    availableShapes: ["square", "rectangular", "hexagonal", "trapezoidal", "curved"],
    thicknessRange: { minMm: 3, maxMm: 100 },
    compatibleAdhesives: ["epoxy", "ceramic-cement"],
    groutRequirements: null,
    applicationTypes: ["sliding-abrasion", "general-purpose"],
    features: [
      "12x more wear resistant than carbon steel",
      "Acid and alkali resistant",
      "Cost-effective",
      "266x wear resistance vs manganese steel",
    ],
  },
  {
    id: "alumina-95-high-grade",
    name: "95% Alumina Ceramic Tile",
    supplier: "Generic",
    material: "alumina-95",
    aluminaContentPercent: 95,
    zirconiaContentPercent: null,
    description:
      "High grade 95% alumina ceramic tile with superior hardness and wear resistance for demanding applications.",
    typicalApplications: [
      "High-wear chutes",
      "Cyclone linings",
      "Pipe elbows",
      "Transfer points",
      "Severe abrasion zones",
    ],
    hardness: { rockwellHRA: 87, vickersGPa: 10, mohs: 9 },
    density: 3.65,
    weightKgPerM2AtTypicalThickness: null,
    compressiveStrengthMPa: 1500,
    flexuralStrengthMPa: 350,
    fractureToughnessMPam: 4.2,
    thermalShockResistance: "fair",
    coefficientOfThermalExpansion: null,
    maxOperatingTempC: 1000,
    wearResistanceRating: "very-high",
    impactResistance: "low",
    availableShapes: ["square", "rectangular", "hexagonal", "trapezoidal", "curved", "dovetail"],
    thicknessRange: { minMm: 6, maxMm: 100 },
    compatibleAdhesives: ["epoxy", "ceramic-cement"],
    groutRequirements: null,
    applicationTypes: ["sliding-abrasion", "high-temperature"],
    features: [
      "Superior hardness",
      "Extended service life",
      "High temperature capability",
      "Premium wear performance",
    ],
  },
  {
    id: "hudco-wearline-92",
    name: "WearLine 90-92% Alumina",
    supplier: "HUDCO WearLine",
    material: "alumina-92",
    aluminaContentPercent: 91,
    zirconiaContentPercent: null,
    description:
      "High density ceramic composed of 90-92% microcrystalline alpha alumina with less than 2% silica. Highest density and lowest residual silica of any commercially available ceramic tile.",
    typicalApplications: [
      "Conveying systems",
      "Bulk material handling",
      "Piping systems",
      "Transfer chutes",
      "Cyclones",
    ],
    hardness: { rockwellHRA: 82, vickersGPa: 9, mohs: 9 },
    density: 3.56,
    weightKgPerM2AtTypicalThickness: null,
    compressiveStrengthMPa: 1770,
    flexuralStrengthMPa: 275,
    fractureToughnessMPam: 3.8,
    thermalShockResistance: "fair",
    coefficientOfThermalExpansion: null,
    maxOperatingTempC: 1250,
    wearResistanceRating: "high",
    impactResistance: "low",
    availableShapes: ["square", "rectangular", "hexagonal", "weldable"],
    thicknessRange: { minMm: 6, maxMm: 50 },
    compatibleAdhesives: ["epoxy", "ceramic-cement"],
    groutRequirements: null,
    applicationTypes: ["sliding-abrasion", "high-temperature", "general-purpose"],
    features: [
      "Highest density available",
      "Lowest silica content (<2%)",
      "Zero apparent porosity",
      "1250°C max temperature",
    ],
  },
  {
    id: "hudco-wearline-96",
    name: "WearLine 96% Alumina",
    supplier: "HUDCO WearLine",
    material: "alumina-96",
    aluminaContentPercent: 96,
    zirconiaContentPercent: null,
    description:
      "Premium 96% alumina ceramic tile with exceptional hardness and compressive strength for the most demanding wear applications.",
    typicalApplications: [
      "Severe wear zones",
      "High-velocity material flow",
      "Fine particle abrasion",
      "Critical transfer points",
    ],
    hardness: { rockwellHRA: 89, vickersGPa: 11.5, mohs: 9 },
    density: 3.72,
    weightKgPerM2AtTypicalThickness: null,
    compressiveStrengthMPa: 2068,
    flexuralStrengthMPa: 358,
    fractureToughnessMPam: 4.5,
    thermalShockResistance: "fair",
    coefficientOfThermalExpansion: null,
    maxOperatingTempC: 1250,
    wearResistanceRating: "very-high",
    impactResistance: "low",
    availableShapes: ["square", "rectangular", "hexagonal"],
    thicknessRange: { minMm: 6, maxMm: 50 },
    compatibleAdhesives: ["epoxy", "ceramic-cement"],
    groutRequirements: null,
    applicationTypes: ["sliding-abrasion", "high-temperature"],
    features: [
      "Premium grade",
      "Exceptional hardness (11.5 GPa)",
      "Zero apparent porosity",
      "Superior compressive strength",
    ],
  },
  {
    id: "zta-impact-resistant",
    name: "Zirconia Toughened Alumina (ZTA)",
    supplier: "Generic",
    material: "zta",
    aluminaContentPercent: 85,
    zirconiaContentPercent: 15,
    description:
      "Composite ceramic with zirconia grains in alumina matrix. Combines extreme abrasion resistance with increased impact resistance through stress-induced transformation toughening.",
    typicalApplications: [
      "Impact zones",
      "Transfer points",
      "Chutes",
      "Launders",
      "Shrouds",
      "Distributors",
      "Centrifuges",
    ],
    hardness: { rockwellHRA: 85, vickersGPa: 12, mohs: 9 },
    density: 4.0,
    weightKgPerM2AtTypicalThickness: null,
    compressiveStrengthMPa: 2500,
    flexuralStrengthMPa: 500,
    fractureToughnessMPam: 6.0,
    thermalShockResistance: "fair",
    coefficientOfThermalExpansion: null,
    maxOperatingTempC: 1000,
    wearResistanceRating: "very-high",
    impactResistance: "high",
    availableShapes: ["square", "rectangular", "hexagonal", "curved"],
    thicknessRange: { minMm: 10, maxMm: 50 },
    compatibleAdhesives: ["epoxy", "ceramic-cement"],
    groutRequirements: null,
    applicationTypes: ["impact-abrasion", "sliding-abrasion"],
    features: [
      "2x stronger than standard alumina",
      "High fracture toughness",
      "Transformation toughening",
      "Excellent for high-impact zones",
      "Rubber-backed options available",
    ],
  },
  {
    id: "multotec-green-dot",
    name: "Green Dot Wear Indicator Tile",
    supplier: "Multotec",
    material: "alumina-92",
    aluminaContentPercent: 92,
    zirconiaContentPercent: null,
    description:
      "Alumina ceramic tile with integrated two-tone wear indicator insert for visual wear monitoring. Unique feature allows plant operators to timeously monitor wear on chute linings.",
    typicalApplications: [
      "Chutes",
      "Transfer points",
      "Areas requiring wear monitoring",
      "Critical equipment",
    ],
    hardness: { rockwellHRA: 82, vickersGPa: 9, mohs: 9 },
    density: 3.6,
    weightKgPerM2AtTypicalThickness: null,
    compressiveStrengthMPa: 1050,
    flexuralStrengthMPa: 220,
    fractureToughnessMPam: 3.7,
    thermalShockResistance: "fair",
    coefficientOfThermalExpansion: null,
    maxOperatingTempC: 750,
    wearResistanceRating: "high",
    impactResistance: "low",
    availableShapes: ["square", "rectangular"],
    thicknessRange: { minMm: 10, maxMm: 25 },
    compatibleAdhesives: ["epoxy", "ceramic-cement"],
    groutRequirements: null,
    applicationTypes: ["sliding-abrasion", "general-purpose"],
    features: [
      "Visual wear indicator",
      "Two-tone insert shows wear depth",
      "Unique worldwide feature",
      "Proactive maintenance planning",
    ],
  },
  {
    id: "silicon-carbide-rbsic",
    name: "Reaction Bonded Silicon Carbide (RBSiC)",
    supplier: "Generic",
    material: "silicon-carbide",
    aluminaContentPercent: 0,
    zirconiaContentPercent: null,
    description:
      "Reaction bonded silicon carbide ceramic with extreme hardness. 5-7x longer service life than alumina. Ideal for severe abrasion with coarse particles in mining applications.",
    typicalApplications: [
      "Cyclones",
      "Severe abrasion zones",
      "Coarse particle handling",
      "Classification equipment",
      "Concentration equipment",
      "Dehydration equipment",
    ],
    hardness: { rockwellHRA: 92, vickersGPa: 26, mohs: 9.5 },
    density: 3.1,
    weightKgPerM2AtTypicalThickness: null,
    compressiveStrengthMPa: 2000,
    flexuralStrengthMPa: 400,
    fractureToughnessMPam: 4.0,
    thermalShockResistance: "fair",
    coefficientOfThermalExpansion: null,
    maxOperatingTempC: 1400,
    wearResistanceRating: "extreme",
    impactResistance: "medium",
    availableShapes: ["square", "rectangular", "curved"],
    thicknessRange: { minMm: 8, maxMm: 45 },
    compatibleAdhesives: ["epoxy", "ceramic-cement"],
    groutRequirements: null,
    applicationTypes: ["sliding-abrasion", "high-temperature", "chemical-resistant"],
    features: [
      "5-7x longer life than alumina",
      "Extreme hardness (Mohs 9.5)",
      "Excellent thermal conductivity",
      "Low thermal expansion",
      "Acid resistant",
      "Lightest ceramic option",
    ],
  },
  {
    id: "ceresist-cer1200",
    name: "CER-1200 Alumina Ceramic",
    supplier: "Ceresist",
    material: "alumina-92",
    aluminaContentPercent: 92,
    zirconiaContentPercent: null,
    description:
      "High-performance alumina ceramic next to diamond in hardness, 12 times more wear-resistant than carbon steel with excellent corrosion resistance.",
    typicalApplications: [
      "Conveying systems",
      "Bulk material handling",
      "Piping systems",
      "Erosion protection",
    ],
    hardness: { rockwellHRA: 82, vickersGPa: 9, mohs: 9 },
    density: 3.6,
    weightKgPerM2AtTypicalThickness: null,
    compressiveStrengthMPa: 1050,
    flexuralStrengthMPa: 220,
    fractureToughnessMPam: 3.7,
    thermalShockResistance: "fair",
    coefficientOfThermalExpansion: null,
    maxOperatingTempC: 750,
    wearResistanceRating: "high",
    impactResistance: "low",
    availableShapes: ["square", "rectangular", "hexagonal", "weldable"],
    thicknessRange: { minMm: 6, maxMm: 50 },
    compatibleAdhesives: ["epoxy", "ceramic-cement"],
    groutRequirements: null,
    applicationTypes: ["sliding-abrasion", "chemical-resistant", "general-purpose"],
    features: [
      "12x wear resistance vs carbon steel",
      "Excellent corrosion resistance",
      "Weldable tile option",
      "Hex mat and rubber mat options",
    ],
  },
  {
    id: "alumina-99-ultra-pure",
    name: "99% Alumina Ultra-Pure Ceramic",
    supplier: "Generic",
    material: "alumina-99",
    aluminaContentPercent: 99,
    zirconiaContentPercent: null,
    description:
      "Ultra-high purity 99% alumina ceramic tile for the most demanding wear applications. Maximum hardness and chemical resistance for severe service.",
    typicalApplications: [
      "Extreme wear zones",
      "High-velocity material flow",
      "Chemical processing",
      "Semiconductor equipment",
      "Laboratory equipment",
    ],
    hardness: { rockwellHRA: 92, vickersGPa: 14, mohs: 9 },
    density: 3.85,
    weightKgPerM2AtTypicalThickness: null,
    compressiveStrengthMPa: 2800,
    flexuralStrengthMPa: 400,
    fractureToughnessMPam: 4.0,
    thermalShockResistance: "fair",
    coefficientOfThermalExpansion: null,
    maxOperatingTempC: 1400,
    wearResistanceRating: "extreme",
    impactResistance: "low",
    availableShapes: ["square", "rectangular"],
    thicknessRange: { minMm: 3, maxMm: 25 },
    compatibleAdhesives: ["epoxy", "ceramic-cement"],
    groutRequirements: null,
    applicationTypes: ["sliding-abrasion", "high-temperature", "chemical-resistant"],
    features: [
      "Ultra-high purity (99% Al2O3)",
      "Maximum hardness",
      "Extreme temperature capability (1400C)",
      "Superior chemical resistance",
      "Lowest porosity",
    ],
  },
  {
    id: "chrome-carbide-overlay-standard",
    name: "Chrome Carbide Overlay Plate (CCO)",
    supplier: "Generic",
    material: "chrome-carbide",
    aluminaContentPercent: 0,
    zirconiaContentPercent: null,
    description:
      "Chromium carbide overlay welded onto mild steel base plate. 35% chrome and 5.5% carbon provides extreme hardness. 20x wear resistance vs mild steel.",
    typicalApplications: [
      "Chutes",
      "Hoppers",
      "Conveyors",
      "Crushers",
      "Skirtboards",
      "Truck bed liners",
      "Screen decks",
    ],
    hardness: { rockwellHRA: null, vickersGPa: 17, mohs: 9 },
    density: 7.8,
    weightKgPerM2AtTypicalThickness: null,
    compressiveStrengthMPa: 2000,
    flexuralStrengthMPa: 800,
    fractureToughnessMPam: 8.0,
    thermalShockResistance: "fair",
    coefficientOfThermalExpansion: null,
    maxOperatingTempC: 600,
    wearResistanceRating: "extreme",
    impactResistance: "high",
    availableShapes: ["rectangular"],
    thicknessRange: { minMm: 6, maxMm: 40 },
    compatibleAdhesives: ["epoxy", "ceramic-cement"],
    groutRequirements: null,
    applicationTypes: ["impact-abrasion", "sliding-abrasion"],
    features: [
      "20x wear resistance vs mild steel",
      "58-62 HRC hardness",
      "35% chromium content",
      "Weldable to steel structures",
      "High impact resistance",
      "Can be plasma cut",
    ],
  },
  {
    id: "kingcera-k99-alumina",
    name: "K99 Ultra-High Purity Alumina",
    supplier: "Generic",
    material: "alumina-99",
    aluminaContentPercent: 99,
    zirconiaContentPercent: null,
    description:
      "Premium grade 99% alumina ceramic liner with exceptional hardness and wear resistance. 266x wear resistance vs manganese steel.",
    typicalApplications: [
      "Mining equipment",
      "Coal handling",
      "Iron ore processing",
      "Copper ore processing",
      "Severe abrasion zones",
    ],
    hardness: { rockwellHRA: 90, vickersGPa: 13, mohs: 9 },
    density: 3.8,
    weightKgPerM2AtTypicalThickness: null,
    compressiveStrengthMPa: 2500,
    flexuralStrengthMPa: 350,
    fractureToughnessMPam: 4.8,
    thermalShockResistance: "fair",
    coefficientOfThermalExpansion: null,
    maxOperatingTempC: 1400,
    wearResistanceRating: "extreme",
    impactResistance: "low",
    availableShapes: ["square", "rectangular", "hexagonal"],
    thicknessRange: { minMm: 6, maxMm: 50 },
    compatibleAdhesives: ["epoxy", "ceramic-cement"],
    groutRequirements: null,
    applicationTypes: ["sliding-abrasion", "high-temperature"],
    features: [
      "266x wear resistance vs manganese steel",
      "171x wear resistance vs high-Cr cast iron",
      "Acid and alkali resistant",
      "Oxidation resistant",
      "Ultra-high purity",
    ],
  },
  {
    id: "titan-zta-premium",
    name: "ZTA Premium Impact Resistant",
    supplier: "TITAN Industrial",
    material: "zta",
    aluminaContentPercent: 80,
    zirconiaContentPercent: 20,
    description:
      "Premium grade Zirconia Toughened Alumina with 20% zirconia content for maximum impact resistance. Transformation toughening mechanism.",
    typicalApplications: [
      "Heavy impact zones",
      "Transfer points",
      "Chute impact areas",
      "Distributor plates",
      "Centrifuge linings",
    ],
    hardness: { rockwellHRA: 88, vickersGPa: 13, mohs: 9 },
    density: 4.2,
    weightKgPerM2AtTypicalThickness: null,
    compressiveStrengthMPa: 2800,
    flexuralStrengthMPa: 600,
    fractureToughnessMPam: 8.0,
    thermalShockResistance: "fair",
    coefficientOfThermalExpansion: null,
    maxOperatingTempC: 1000,
    wearResistanceRating: "very-high",
    impactResistance: "high",
    availableShapes: ["square", "rectangular", "hexagonal", "curved"],
    thicknessRange: { minMm: 10, maxMm: 50 },
    compatibleAdhesives: ["epoxy", "ceramic-cement"],
    groutRequirements: null,
    applicationTypes: ["impact-abrasion", "sliding-abrasion"],
    features: [
      "20% zirconia content",
      "Maximum fracture toughness (8 MPam1/2)",
      "Transformation toughening",
      "3x stronger than standard alumina",
      "Rubber-backed options available",
    ],
  },
  {
    id: "basalt-standard",
    name: "Cast Basalt Tile",
    supplier: "Generic",
    material: "basalt",
    aluminaContentPercent: 0,
    zirconiaContentPercent: null,
    description:
      "Cast basalt tile made from naturally occurring volcanic rock. Excellent chemical resistance and good wear properties at lower cost than alumina ceramics.",
    typicalApplications: [
      "Conveyor chutes",
      "Hoppers",
      "Cyclone linings",
      "Chemical tanks",
      "Acid resistant flooring",
      "Mineral processing equipment",
    ],
    hardness: { rockwellHRA: 75, vickersGPa: 8, mohs: 8 },
    density: 2.9,
    weightKgPerM2AtTypicalThickness: 58,
    compressiveStrengthMPa: 450,
    flexuralStrengthMPa: 45,
    fractureToughnessMPam: 2.0,
    thermalShockResistance: "fair",
    coefficientOfThermalExpansion: null,
    maxOperatingTempC: 350,
    wearResistanceRating: "standard",
    impactResistance: "low",
    availableShapes: ["square", "rectangular", "hexagonal", "curved"],
    thicknessRange: { minMm: 10, maxMm: 50 },
    compatibleAdhesives: ["epoxy", "ceramic-cement"],
    groutRequirements: null,
    applicationTypes: ["sliding-abrasion", "chemical-resistant", "general-purpose"],
    features: [
      "Natural material - sustainable",
      "Excellent acid resistance",
      "Good alkali resistance",
      "Lower cost than alumina",
      "Non-porous surface",
      "Self-healing micro cracks when reheated",
    ],
  },
  {
    id: "tungsten-carbide-tile",
    name: "Tungsten Carbide Wear Tile",
    supplier: "Generic",
    material: "tungsten-carbide",
    aluminaContentPercent: 0,
    zirconiaContentPercent: null,
    description:
      "Sintered tungsten carbide tiles for extreme wear applications. Highest hardness and wear resistance available but brittle under impact.",
    typicalApplications: [
      "Fine particle high velocity erosion",
      "Slurry pump wear rings",
      "Cutting tool surfaces",
      "Sand blasting nozzles",
      "Extreme wear zones",
    ],
    hardness: { rockwellHRA: 92, vickersGPa: 22, mohs: 9.5 },
    density: 15.0,
    weightKgPerM2AtTypicalThickness: 150,
    compressiveStrengthMPa: 5000,
    flexuralStrengthMPa: 1500,
    fractureToughnessMPam: 12.0,
    thermalShockResistance: "fair",
    coefficientOfThermalExpansion: null,
    maxOperatingTempC: 500,
    wearResistanceRating: "extreme",
    impactResistance: "low",
    availableShapes: ["square", "rectangular"],
    thicknessRange: { minMm: 3, maxMm: 15 },
    compatibleAdhesives: ["epoxy", "ceramic-cement"],
    groutRequirements: null,
    applicationTypes: ["sliding-abrasion"],
    features: [
      "Highest hardness available",
      "Extreme wear resistance",
      "Very high density",
      "Excellent for fine particle erosion",
      "Brittle - not for impact zones",
      "Premium cost material",
    ],
  },
];

export function ceramicProductsBySupplier(supplier: CeramicSupplier): CeramicProduct[] {
  return ceramicProducts.filter((p) => p.supplier === supplier);
}

export function ceramicProductsByMaterial(material: CeramicMaterial): CeramicProduct[] {
  return ceramicProducts.filter((p) => p.material === material);
}

export function ceramicProductsForApplication(appType: ApplicationType): CeramicProduct[] {
  return ceramicProducts.filter((p) => p.applicationTypes.includes(appType));
}

export function ceramicProductsForTemperature(tempC: number): CeramicProduct[] {
  return ceramicProducts.filter((p) => p.maxOperatingTempC >= tempC);
}

export function highImpactCeramicProducts(): CeramicProduct[] {
  return ceramicProducts.filter(
    (p) => p.impactResistance === "high" || p.impactResistance === "medium",
  );
}

export function ceramicProductsByWearRating(
  rating: "standard" | "high" | "very-high" | "extreme",
): CeramicProduct[] {
  const ratingOrder = { standard: 1, high: 2, "very-high": 3, extreme: 4 };
  const minRating = ratingOrder[rating];
  return ceramicProducts.filter((p) => ratingOrder[p.wearResistanceRating] >= minRating);
}

export function ceramicProductsByAluminaContent(minPercent: number): CeramicProduct[] {
  return ceramicProducts.filter((p) => p.aluminaContentPercent >= minPercent);
}

export function bestCeramicForImpactZones(): CeramicProduct[] {
  return [...ceramicProducts]
    .filter((p) => p.impactResistance !== "low")
    .sort((a, b) => b.fractureToughnessMPam - a.fractureToughnessMPam);
}

export function bestCeramicForSlidingAbrasion(): CeramicProduct[] {
  const hardnessRank = (p: CeramicProduct): number => p.hardness.vickersGPa || 0;
  return [...ceramicProducts]
    .filter((p) => p.applicationTypes.includes("sliding-abrasion"))
    .sort((a, b) => hardnessRank(b) - hardnessRank(a));
}
