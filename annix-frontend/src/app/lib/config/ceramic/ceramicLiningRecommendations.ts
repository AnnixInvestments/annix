import type { AdhesiveType, CeramicMaterial, CeramicProduct, TileShape } from "./ceramicProducts";
import {
  bestCeramicForImpactZones,
  bestCeramicForSlidingAbrasion,
  ceramicProducts,
  ceramicProductsByMaterial,
} from "./ceramicProducts";

export interface CeramicLiningRequirements {
  dominantMechanism: "sliding-abrasion" | "impact-abrasion" | "mixed";
  particleSize: "fine" | "medium" | "coarse";
  impactSeverity: "low" | "medium" | "high";
  operatingTempC?: number;
  chemicalExposure?: boolean;
  budgetConstraint?: "standard" | "premium";
}

export interface RecommendedCeramicLining {
  primary: CeramicProduct | null;
  alternatives: CeramicProduct[];
  thicknessRecommendation: string;
  systemDescription: string;
  installationNotes: string[];
  engineeringNotes: string[];
  warnings: string[];
}

function thicknessForApplication(
  mechanism: "sliding-abrasion" | "impact-abrasion" | "mixed",
  particleSize: "fine" | "medium" | "coarse",
): string {
  if (mechanism === "impact-abrasion") {
    return "15-25mm (impact zones require thicker tiles with rubber backing)";
  }
  if (particleSize === "coarse") {
    return "12-20mm (coarse particles require increased thickness)";
  }
  if (particleSize === "fine") {
    return "6-12mm (fine particle sliding abrasion)";
  }
  return "10-15mm (medium particle applications)";
}

function filterByBudget(
  products: CeramicProduct[],
  budget: "standard" | "premium" | undefined,
): CeramicProduct[] {
  if (budget === "standard") {
    return products.filter((p) => p.material === "alumina-92" || p.wearResistanceRating === "high");
  }
  return products;
}

export function recommendCeramicLining(
  requirements: CeramicLiningRequirements,
): RecommendedCeramicLining {
  const {
    dominantMechanism,
    particleSize,
    impactSeverity,
    operatingTempC,
    chemicalExposure,
    budgetConstraint,
  } = requirements;

  let candidates: CeramicProduct[] = [];
  const warnings: string[] = [];
  const engineeringNotes: string[] = [];
  const installationNotes: string[] = [];

  if (dominantMechanism === "impact-abrasion" || impactSeverity === "high") {
    candidates = bestCeramicForImpactZones();
    engineeringNotes.push("High impact severity - ZTA or rubber-backed ceramic recommended");
    installationNotes.push("Use rubber backing (6-10mm) to absorb impact energy");
    installationNotes.push("Consider steel backing plate with studs for severe impact");
  } else if (dominantMechanism === "sliding-abrasion") {
    candidates = bestCeramicForSlidingAbrasion();
    engineeringNotes.push("Sliding abrasion dominant - prioritise hardness over toughness");
  } else {
    candidates = [...ceramicProducts];
    engineeringNotes.push("Mixed wear mechanism - balance hardness and toughness");
  }

  if (particleSize === "coarse") {
    const sic = candidates.filter((p) => p.material === "silicon-carbide");
    if (sic.length > 0) {
      candidates = [...sic, ...candidates.filter((p) => p.material !== "silicon-carbide")];
      engineeringNotes.push("Coarse particles - silicon carbide offers superior performance");
    }
  }

  if (operatingTempC !== undefined && operatingTempC > 750) {
    candidates = candidates.filter((p) => p.maxOperatingTempC >= operatingTempC);
    engineeringNotes.push(
      `High temperature (${operatingTempC}°C) - verify tile temperature rating`,
    );
  }

  if (chemicalExposure) {
    const chemResistant = candidates.filter((p) =>
      p.applicationTypes.includes("chemical-resistant"),
    );
    if (chemResistant.length > 0) {
      candidates = [
        ...chemResistant,
        ...candidates.filter((p) => !p.applicationTypes.includes("chemical-resistant")),
      ];
    }
    engineeringNotes.push("Chemical exposure - verify compatibility with specific chemicals");
  }

  candidates = filterByBudget(candidates, budgetConstraint);

  if (impactSeverity === "low" && dominantMechanism === "sliding-abrasion") {
    candidates = candidates.filter(
      (p) => p.impactResistance === "low" || p.impactResistance === "medium",
    );
  }

  const primary = candidates[0] || null;
  const alternatives = candidates.slice(1, 4);

  if (impactSeverity === "high" && primary?.impactResistance === "low") {
    warnings.push("Selected tile has low impact resistance - consider ZTA or rubber-backed system");
  }

  if (primary) {
    engineeringNotes.push(`Material: ${primary.aluminaContentPercent}% Al₂O₃`);
    engineeringNotes.push(
      `Hardness: ${primary.hardness.mohs} Mohs, ${primary.hardness.vickersGPa} GPa Vickers`,
    );
    engineeringNotes.push(`Fracture toughness: ${primary.fractureToughnessMPam} MPa·m^1/2`);
    installationNotes.push("Chamfered edges reduce chipping and improve tile-to-tile fit");
    installationNotes.push("Minimise gaps between tiles to prevent material ingress");
  }

  return {
    primary,
    alternatives,
    thicknessRecommendation: thicknessForApplication(dominantMechanism, particleSize),
    systemDescription: primary
      ? `${primary.supplier} ${primary.name} (${primary.material})`
      : "No suitable product found",
    installationNotes,
    engineeringNotes,
    warnings,
  };
}

export function recommendForImpactZones(): RecommendedCeramicLining {
  return recommendCeramicLining({
    dominantMechanism: "impact-abrasion",
    particleSize: "coarse",
    impactSeverity: "high",
  });
}

export function recommendForSlidingAbrasion(
  particleSize: "fine" | "medium" | "coarse" = "medium",
): RecommendedCeramicLining {
  return recommendCeramicLining({
    dominantMechanism: "sliding-abrasion",
    particleSize,
    impactSeverity: "low",
  });
}

export function recommendForCyclones(): RecommendedCeramicLining {
  return recommendCeramicLining({
    dominantMechanism: "sliding-abrasion",
    particleSize: "fine",
    impactSeverity: "medium",
    budgetConstraint: "premium",
  });
}

export function recommendForChutes(
  impactLevel: "low" | "medium" | "high" = "medium",
): RecommendedCeramicLining {
  return recommendCeramicLining({
    dominantMechanism: impactLevel === "high" ? "impact-abrasion" : "mixed",
    particleSize: "medium",
    impactSeverity: impactLevel,
  });
}

export function recommendForHighTemperature(tempC: number): RecommendedCeramicLining {
  return recommendCeramicLining({
    dominantMechanism: "sliding-abrasion",
    particleSize: "medium",
    impactSeverity: "low",
    operatingTempC: tempC,
  });
}

export function allCeramicProducts(): CeramicProduct[] {
  return ceramicProducts;
}

export function ceramicProductById(id: string): CeramicProduct | undefined {
  return ceramicProducts.find((p) => p.id === id);
}

export function compareCeramicMaterials(): {
  material: CeramicMaterial;
  hardness: number;
  toughness: number;
  maxTemp: number;
  impactResistance: string;
}[] {
  const materials: CeramicMaterial[] = [
    "alumina-92",
    "alumina-95",
    "alumina-96",
    "alumina-99",
    "zta",
    "silicon-carbide",
    "chrome-carbide",
    "basalt",
    "tungsten-carbide",
  ];
  return materials
    .map((material) => {
      const products = ceramicProductsByMaterial(material);
      const representative = products[0];
      return {
        material,
        hardness: representative?.hardness.vickersGPa || 0,
        toughness: representative?.fractureToughnessMPam || 0,
        maxTemp: representative?.maxOperatingTempC || 0,
        impactResistance: representative?.impactResistance || "unknown",
      };
    })
    .filter((m) => m.hardness > 0);
}

export type EquipmentGeometryType =
  | "pipe"
  | "elbow"
  | "cone"
  | "cylinder"
  | "flat"
  | "hopper"
  | "chute"
  | "cyclone";

export interface TileLayoutGeometry {
  equipmentType: EquipmentGeometryType;
  internalDiameterMm?: number;
  lengthMm?: number;
  widthMm?: number;
  coneAngleDegrees?: number;
  curvatureRadiusMm?: number;
}

export interface TileLayoutResult {
  recommendedShape: TileShape;
  alternativeShapes: TileShape[];
  recommendedSizeMm: { width: number; height: number };
  tileSizeOptions: { width: number; height: number; description: string }[];
  tilesPerM2: number;
  layoutPattern: string;
  installationNotes: string[];
  warnings: string[];
}

export interface AdhesiveConditions {
  operatingTempC: number;
  peakTempC?: number;
  chemicalExposure: "none" | "mild" | "moderate" | "severe";
  immersionService: boolean;
  vibration: "none" | "low" | "moderate" | "high";
  impactLoading: boolean;
  substrateType: "carbon-steel" | "stainless-steel" | "concrete" | "rubber-backing";
}

export interface AdhesiveRecommendation {
  primaryAdhesive: AdhesiveType;
  alternativeAdhesives: AdhesiveType[];
  applicationMethod: string;
  mixRatio?: string;
  potLifeMinutes: number;
  cureTimeHours: number;
  bondStrengthMPa: number;
  maxServiceTempC: number;
  chemicalResistance: "poor" | "fair" | "good" | "excellent";
  requirements: string[];
  warnings: string[];
}

export interface CompositeSystemConfig {
  impactSeverity: "low" | "moderate" | "high" | "severe";
  abrasionType: "sliding" | "impact" | "erosion" | "mixed";
  operatingTempC: number;
  chemicalExposure: boolean;
  equipmentType: EquipmentGeometryType;
}

export interface CompositeSystemRecommendation {
  systemType: "ceramic-only" | "rubber-backed-ceramic" | "rubber-ceramic-steel";
  ceramicProduct: CeramicProduct | null;
  rubberBackingThicknessMm: number | null;
  rubberType: "natural-rubber" | "sbr" | "epdm" | "neoprene" | null;
  steelBackingRequired: boolean;
  totalSystemThicknessMm: number;
  systemDescription: string;
  layerDetails: { layer: string; material: string; thicknessMm: number }[];
  installationSequence: string[];
  engineeringNotes: string[];
  warnings: string[];
}

export interface ImpactZoneDefinition {
  zoneName: string;
  impactAngleDegrees: number;
  dropHeightMm?: number;
  particleSizeMm: number;
  particleVelocityMps: number;
}

export interface ImpactZoneRecommendation {
  zone: string;
  severity: "low" | "moderate" | "high" | "severe";
  recommendedProduct: CeramicProduct | null;
  recommendedThicknessMm: number;
  rubberBackingRequired: boolean;
  rubberThicknessMm: number | null;
  tileShape: TileShape;
  rationale: string;
  engineeringNotes: string[];
}

export interface ThermalCyclingConditions {
  minTempC: number;
  maxTempC: number;
  cyclesPerDay: number;
  rampRateCPerMinute: number;
  operatingEnvironment: "dry" | "wet" | "steam";
}

export interface ThermalCyclingResult {
  isSuitable: boolean;
  suitabilityRating: "unsuitable" | "marginal" | "acceptable" | "good" | "excellent";
  recommendedProducts: CeramicProduct[];
  thermalStressRisk: "low" | "moderate" | "high" | "severe";
  estimatedCycleLife: number | null;
  deltaT: number;
  thermalShockSeverity: "mild" | "moderate" | "severe";
  mitigationStrategies: string[];
  installationRequirements: string[];
  warnings: string[];
}

export function calculateTileLayout(geometry: TileLayoutGeometry): TileLayoutResult {
  const installationNotes: string[] = [];
  const warnings: string[] = [];
  const tileSizeOptions: { width: number; height: number; description: string }[] = [];

  const shapeForGeometry: Record<EquipmentGeometryType, TileShape> = {
    pipe: "hexagonal",
    elbow: "hexagonal",
    cone: "trapezoidal",
    cylinder: "rectangular",
    flat: "square",
    hopper: "rectangular",
    chute: "rectangular",
    cyclone: "hexagonal",
  };

  const recommendedShape = shapeForGeometry[geometry.equipmentType];
  const alternativeShapes: TileShape[] = [];

  if (recommendedShape === "hexagonal") {
    alternativeShapes.push("square", "rectangular");
    installationNotes.push(
      "Hexagonal tiles provide better coverage on curved surfaces with minimal gaps",
    );
  } else if (recommendedShape === "trapezoidal") {
    alternativeShapes.push("rectangular");
    installationNotes.push("Trapezoidal tiles fit conical geometry without excessive cutting");
  } else if (recommendedShape === "rectangular") {
    alternativeShapes.push("square", "hexagonal");
  } else {
    alternativeShapes.push("rectangular", "hexagonal");
  }

  let recommendedWidth = 50;
  let recommendedHeight = 50;

  if (geometry.internalDiameterMm !== undefined) {
    const circumference = Math.PI * geometry.internalDiameterMm;

    if (geometry.internalDiameterMm < 200) {
      recommendedWidth = 20;
      recommendedHeight = 20;
      warnings.push("Small diameter may require custom-sized tiles");
      tileSizeOptions.push({ width: 20, height: 20, description: "Small tiles for tight curves" });
      tileSizeOptions.push({
        width: 15,
        height: 15,
        description: "Minimum size for very small diameter",
      });
    } else if (geometry.internalDiameterMm < 400) {
      recommendedWidth = 25;
      recommendedHeight = 25;
      tileSizeOptions.push({ width: 25, height: 25, description: "Standard small diameter" });
      tileSizeOptions.push({
        width: 30,
        height: 30,
        description: "Alternative for moderate curves",
      });
    } else if (geometry.internalDiameterMm < 800) {
      recommendedWidth = 50;
      recommendedHeight = 50;
      tileSizeOptions.push({ width: 50, height: 50, description: "Standard medium diameter" });
      tileSizeOptions.push({ width: 40, height: 40, description: "Tighter coverage" });
    } else {
      recommendedWidth = 100;
      recommendedHeight = 100;
      tileSizeOptions.push({ width: 100, height: 100, description: "Large diameter standard" });
      tileSizeOptions.push({ width: 75, height: 75, description: "Medium large tiles" });
      tileSizeOptions.push({
        width: 50,
        height: 50,
        description: "Smaller option for complex areas",
      });
    }

    const tilesAroundCircumference = Math.ceil(circumference / recommendedWidth);
    installationNotes.push(`Approximately ${tilesAroundCircumference} tiles around circumference`);
  } else if (geometry.equipmentType === "flat" || geometry.equipmentType === "chute") {
    recommendedWidth = 100;
    recommendedHeight = 100;
    tileSizeOptions.push({ width: 100, height: 100, description: "Standard flat surface" });
    tileSizeOptions.push({
      width: 150,
      height: 150,
      description: "Large format for faster installation",
    });
    tileSizeOptions.push({ width: 50, height: 50, description: "Small format for detail areas" });
  } else {
    tileSizeOptions.push({ width: 50, height: 50, description: "General purpose" });
    tileSizeOptions.push({ width: 100, height: 100, description: "Large format" });
  }

  if (geometry.coneAngleDegrees !== undefined && geometry.coneAngleDegrees > 45) {
    warnings.push("Steep cone angle may require custom trapezoidal tiles");
    installationNotes.push("Consider segmented installation for steep angles");
  }

  const tileAreaM2 = (recommendedWidth / 1000) * (recommendedHeight / 1000);
  const tilesPerM2 = Math.ceil((1 / tileAreaM2) * 1.05);

  const layoutPattern =
    recommendedShape === "hexagonal"
      ? "Staggered hexagonal pattern - offset rows by half tile width"
      : recommendedShape === "trapezoidal"
        ? "Radial pattern from apex - align tile edges to cone radius"
        : "Grid pattern - align joints with material flow direction";

  installationNotes.push("Maintain 2-3mm gap between tiles for grout/adhesive");
  installationNotes.push("Stagger joints to prevent continuous weak lines");
  installationNotes.push("Pre-fit tiles before adhesive application");

  return {
    recommendedShape,
    alternativeShapes,
    recommendedSizeMm: { width: recommendedWidth, height: recommendedHeight },
    tileSizeOptions,
    tilesPerM2,
    layoutPattern,
    installationNotes,
    warnings,
  };
}

export function selectCeramicAdhesive(conditions: AdhesiveConditions): AdhesiveRecommendation {
  const requirements: string[] = [];
  const warnings: string[] = [];

  const peakTemp = conditions.peakTempC ?? conditions.operatingTempC;

  if (conditions.substrateType === "rubber-backing") {
    return {
      primaryAdhesive: "rubber-backing",
      alternativeAdhesives: [],
      applicationMethod:
        "Vulcanized bond - ceramic tiles embedded in uncured rubber sheet during vulcanization",
      potLifeMinutes: 0,
      cureTimeHours: 2,
      bondStrengthMPa: 8,
      maxServiceTempC: 80,
      chemicalResistance: "good",
      requirements: [
        "Autoclave vulcanization at 140-155°C, 280-350 kPa",
        "Ceramic tiles must be pre-treated with silane coupling agent",
        "Ensure uniform pressure during cure",
      ],
      warnings:
        conditions.operatingTempC > 80
          ? ["Rubber backing not suitable for temperatures above 80°C"]
          : [],
    };
  }

  if (peakTemp > 350) {
    requirements.push("Surface preparation: grit blast to Sa 2.5");
    requirements.push("Preheat substrate to 40-60°C before application");
    requirements.push("Allow full cure before thermal exposure");

    if (peakTemp > 800) {
      return {
        primaryAdhesive: "sodium-silicate",
        alternativeAdhesives: ["ceramic-cement"],
        applicationMethod: "Trowel apply sodium silicate mortar 3-5mm thick, press tiles firmly",
        potLifeMinutes: 30,
        cureTimeHours: 24,
        bondStrengthMPa: 5,
        maxServiceTempC: 1200,
        chemicalResistance: "fair",
        requirements: [
          ...requirements,
          "Cure at ambient for 24h, then heat cure at 200°C for 2h",
          "Avoid rapid temperature changes during initial service",
        ],
        warnings: ["Sodium silicate has poor resistance to acids and water"],
      };
    }

    return {
      primaryAdhesive: "ceramic-cement",
      alternativeAdhesives: ["sodium-silicate"],
      applicationMethod: "Trowel apply ceramic cement mortar 3-6mm thick",
      potLifeMinutes: 45,
      cureTimeHours: 24,
      bondStrengthMPa: 8,
      maxServiceTempC: 1000,
      chemicalResistance: "good",
      requirements: [
        ...requirements,
        "Mix ratio per manufacturer TDS",
        "Full cure 7 days at ambient before high-temp service",
      ],
      warnings: [],
    };
  }

  if (conditions.chemicalExposure === "severe" || conditions.immersionService) {
    requirements.push("Surface preparation: grit blast to Sa 2.5");
    requirements.push("Apply within 4 hours of surface preparation");
    requirements.push("Ensure complete coverage - no voids under tiles");

    return {
      primaryAdhesive: "epoxy",
      alternativeAdhesives: ["polyurethane"],
      applicationMethod: "Notched trowel application, 3-5mm bed thickness",
      mixRatio: "2:1 or per manufacturer TDS",
      potLifeMinutes: 45,
      cureTimeHours: 24,
      bondStrengthMPa: 15,
      maxServiceTempC: 120,
      chemicalResistance: "excellent",
      requirements: [
        ...requirements,
        "Use chemical-resistant epoxy grade",
        "Verify compatibility with specific chemicals",
      ],
      warnings:
        conditions.operatingTempC > 120
          ? ["Epoxy adhesive temperature limit may be exceeded - consider ceramic cement"]
          : [],
    };
  }

  if (conditions.impactLoading || conditions.vibration === "high") {
    requirements.push("Surface preparation: grit blast to Sa 2.5");
    requirements.push("Use flexible adhesive grade");

    return {
      primaryAdhesive: "polyurethane",
      alternativeAdhesives: ["epoxy"],
      applicationMethod: "Notched trowel application, 3-5mm bed thickness",
      mixRatio: "Per manufacturer TDS",
      potLifeMinutes: 30,
      cureTimeHours: 16,
      bondStrengthMPa: 12,
      maxServiceTempC: 80,
      chemicalResistance: "good",
      requirements: [
        ...requirements,
        "Polyurethane provides flexibility for impact absorption",
        "Consider rubber backing for severe impact",
      ],
      warnings:
        conditions.operatingTempC > 80
          ? ["Polyurethane temperature limit exceeded - use epoxy with rubber backing"]
          : [],
    };
  }

  requirements.push("Surface preparation: grit blast to Sa 2.5 or St 3");
  requirements.push("Apply primer if substrate is porous");

  return {
    primaryAdhesive: "epoxy",
    alternativeAdhesives: ["polyurethane", "ceramic-cement"],
    applicationMethod: "Notched trowel application, 3-5mm bed thickness",
    mixRatio: "2:1 or per manufacturer TDS",
    potLifeMinutes: 60,
    cureTimeHours: 24,
    bondStrengthMPa: 15,
    maxServiceTempC: 120,
    chemicalResistance: "good",
    requirements,
    warnings,
  };
}

export function buildCompositeSystem(config: CompositeSystemConfig): CompositeSystemRecommendation {
  const engineeringNotes: string[] = [];
  const warnings: string[] = [];
  const installationSequence: string[] = [];
  const layerDetails: { layer: string; material: string; thicknessMm: number }[] = [];

  const impactProducts = bestCeramicForImpactZones();
  const abrasionProducts = bestCeramicForSlidingAbrasion();

  let ceramicProduct: CeramicProduct | null = null;
  let rubberBackingThicknessMm: number | null = null;
  let rubberType: "natural-rubber" | "sbr" | "epdm" | "neoprene" | null = null;
  let steelBackingRequired = false;
  let systemType: "ceramic-only" | "rubber-backed-ceramic" | "rubber-ceramic-steel" =
    "ceramic-only";

  if (config.impactSeverity === "severe") {
    systemType = "rubber-ceramic-steel";
    ceramicProduct = impactProducts.find((p) => p.material === "zta") || impactProducts[0] || null;
    rubberBackingThicknessMm = 12;
    rubberType = "natural-rubber";
    steelBackingRequired = true;

    layerDetails.push({
      layer: "Steel backing",
      material: "Mild steel plate with studs",
      thicknessMm: 6,
    });
    layerDetails.push({
      layer: "Rubber backing",
      material: "Natural rubber (40-50 Shore A)",
      thicknessMm: 12,
    });
    layerDetails.push({
      layer: "Ceramic wear face",
      material: ceramicProduct?.name || "ZTA",
      thicknessMm: 20,
    });

    installationSequence.push("1. Weld steel backing plate with studs to equipment shell");
    installationSequence.push(
      "2. Apply rubber sheet to steel backing (vulcanized or adhesive bonded)",
    );
    installationSequence.push(
      "3. Embed ceramic tiles in rubber during vulcanization or adhere to cured rubber",
    );
    installationSequence.push("4. Grout tile joints with flexible epoxy");

    engineeringNotes.push("Three-layer system provides maximum impact absorption");
    engineeringNotes.push("Steel studs transfer load to equipment shell");
    engineeringNotes.push("Rubber layer absorbs impact energy before ceramic fracture");
  } else if (config.impactSeverity === "high" || config.abrasionType === "impact") {
    systemType = "rubber-backed-ceramic";
    ceramicProduct = impactProducts.find((p) => p.material === "zta") || impactProducts[0] || null;
    rubberBackingThicknessMm = config.impactSeverity === "high" ? 10 : 6;
    rubberType = "natural-rubber";

    layerDetails.push({
      layer: "Rubber backing",
      material: "Natural rubber (40-50 Shore A)",
      thicknessMm: rubberBackingThicknessMm,
    });
    layerDetails.push({
      layer: "Ceramic wear face",
      material: ceramicProduct?.name || "ZTA",
      thicknessMm: 15,
    });

    installationSequence.push("1. Prepare substrate - grit blast to Sa 2.5");
    installationSequence.push("2. Apply rubber sheet with ceramic tiles pre-vulcanized");
    installationSequence.push("3. Bond composite panel to substrate using epoxy or autoclave cure");
    installationSequence.push("4. Seal joints between panels");

    engineeringNotes.push("Rubber backing absorbs impact energy");
    engineeringNotes.push("ZTA ceramic provides high fracture toughness");
  } else if (config.impactSeverity === "moderate") {
    systemType = "rubber-backed-ceramic";
    ceramicProduct =
      config.abrasionType === "sliding" ? abrasionProducts[0] || null : impactProducts[0] || null;
    rubberBackingThicknessMm = 6;
    rubberType = "sbr";

    layerDetails.push({
      layer: "Rubber backing",
      material: "SBR rubber (50-60 Shore A)",
      thicknessMm: 6,
    });
    layerDetails.push({
      layer: "Ceramic wear face",
      material: ceramicProduct?.name || "Alumina",
      thicknessMm: 12,
    });

    installationSequence.push("1. Prepare substrate - grit blast to Sa 2.5");
    installationSequence.push("2. Apply adhesive to substrate");
    installationSequence.push("3. Install pre-made rubber-backed ceramic panels");
    installationSequence.push("4. Grout tile joints");

    engineeringNotes.push("Moderate impact - rubber backing provides adequate protection");
  } else {
    systemType = "ceramic-only";
    ceramicProduct = abrasionProducts[0] || null;

    layerDetails.push({
      layer: "Ceramic wear face",
      material: ceramicProduct?.name || "Alumina",
      thicknessMm: 10,
    });

    installationSequence.push("1. Prepare substrate - grit blast to Sa 2.5");
    installationSequence.push("2. Apply epoxy adhesive with notched trowel");
    installationSequence.push("3. Install ceramic tiles");
    installationSequence.push("4. Grout tile joints");

    engineeringNotes.push("Low impact - direct ceramic bonding suitable");
  }

  if (config.operatingTempC > 80 && rubberBackingThicknessMm !== null) {
    if (config.operatingTempC > 120) {
      warnings.push(
        "Operating temperature exceeds rubber limits - consider EPDM or ceramic-only system",
      );
      rubberType = "epdm";
    } else {
      rubberType = "epdm";
      engineeringNotes.push("EPDM rubber selected for elevated temperature service");
    }
  }

  if (config.chemicalExposure && rubberType !== null) {
    warnings.push("Verify rubber chemical compatibility with process media");
    if (rubberType === "natural-rubber") {
      rubberType = "neoprene";
      engineeringNotes.push("Neoprene selected for chemical resistance");
    }
  }

  const totalSystemThicknessMm = layerDetails.reduce((sum, layer) => sum + layer.thicknessMm, 0);

  return {
    systemType,
    ceramicProduct,
    rubberBackingThicknessMm,
    rubberType,
    steelBackingRequired,
    totalSystemThicknessMm,
    systemDescription: `${systemType.replace(/-/g, " ")} - ${ceramicProduct?.name || "TBD"} (${totalSystemThicknessMm}mm total)`,
    layerDetails,
    installationSequence,
    engineeringNotes,
    warnings,
  };
}

export function identifyImpactZones(zones: ImpactZoneDefinition[]): ImpactZoneRecommendation[] {
  return zones.map((zone) => {
    const impactEnergy =
      zone.dropHeightMm !== undefined
        ? (zone.particleSizeMm / 1000) * 2500 * 9.81 * (zone.dropHeightMm / 1000)
        : ((zone.particleSizeMm / 1000) * 2500 * zone.particleVelocityMps ** 2) / 2;

    const angleFactor = Math.sin((zone.impactAngleDegrees * Math.PI) / 180);
    const adjustedEnergy = impactEnergy * angleFactor;

    let severity: "low" | "moderate" | "high" | "severe";
    let recommendedThicknessMm: number;
    let rubberBackingRequired: boolean;
    let rubberThicknessMm: number | null;

    if (adjustedEnergy > 50 || zone.impactAngleDegrees > 75) {
      severity = "severe";
      recommendedThicknessMm = 25;
      rubberBackingRequired = true;
      rubberThicknessMm = 12;
    } else if (adjustedEnergy > 20 || zone.impactAngleDegrees > 60) {
      severity = "high";
      recommendedThicknessMm = 20;
      rubberBackingRequired = true;
      rubberThicknessMm = 10;
    } else if (adjustedEnergy > 5 || zone.impactAngleDegrees > 45) {
      severity = "moderate";
      recommendedThicknessMm = 15;
      rubberBackingRequired = true;
      rubberThicknessMm = 6;
    } else {
      severity = "low";
      recommendedThicknessMm = 10;
      rubberBackingRequired = false;
      rubberThicknessMm = null;
    }

    const impactProducts = bestCeramicForImpactZones();
    let recommendedProduct: CeramicProduct | null = null;

    if (severity === "severe" || severity === "high") {
      recommendedProduct =
        impactProducts.find((p) => p.material === "zta") || impactProducts[0] || null;
    } else if (severity === "moderate") {
      recommendedProduct =
        impactProducts.find(
          (p) => p.impactResistance === "medium" || p.impactResistance === "high",
        ) ||
        impactProducts[0] ||
        null;
    } else {
      recommendedProduct = ceramicProducts.find((p) => p.wearResistanceRating === "high") || null;
    }

    const tileShape: TileShape = zone.impactAngleDegrees > 60 ? "hexagonal" : "square";

    const engineeringNotes: string[] = [];
    engineeringNotes.push(
      `Impact angle: ${zone.impactAngleDegrees}° - ${angleFactor > 0.7 ? "high normal component" : "glancing impact"}`,
    );
    engineeringNotes.push(`Estimated impact energy: ${adjustedEnergy.toFixed(1)} J`);
    if (rubberBackingRequired) {
      engineeringNotes.push(
        "Rubber backing absorbs impact energy and reduces ceramic fracture risk",
      );
    }
    if (zone.particleSizeMm > 50) {
      engineeringNotes.push("Large particles - consider CCO overlay for extreme impact");
    }

    return {
      zone: zone.zoneName,
      severity,
      recommendedProduct,
      recommendedThicknessMm,
      rubberBackingRequired,
      rubberThicknessMm,
      tileShape,
      rationale:
        severity === "severe"
          ? "Severe impact zone requires ZTA ceramic with rubber backing for maximum toughness"
          : severity === "high"
            ? "High impact zone benefits from ZTA or high-toughness alumina with rubber backing"
            : severity === "moderate"
              ? "Moderate impact - standard ceramic with thin rubber backing recommended"
              : "Low impact - standard ceramic tiles suitable",
      engineeringNotes,
    };
  });
}

export function checkThermalCycling(
  product: CeramicProduct,
  conditions: ThermalCyclingConditions,
): ThermalCyclingResult {
  const mitigationStrategies: string[] = [];
  const installationRequirements: string[] = [];
  const warnings: string[] = [];

  const deltaT = conditions.maxTempC - conditions.minTempC;
  const rampRate = conditions.rampRateCPerMinute;

  let thermalShockSeverity: "mild" | "moderate" | "severe";
  if (deltaT > 300 || rampRate > 20) {
    thermalShockSeverity = "severe";
  } else if (deltaT > 150 || rampRate > 10) {
    thermalShockSeverity = "moderate";
  } else {
    thermalShockSeverity = "mild";
  }

  const shockResistanceScore: Record<string, number> = {
    poor: 1,
    fair: 2,
    good: 3,
    excellent: 4,
  };

  const productScore = shockResistanceScore[product.thermalShockResistance];
  const requiredScore =
    thermalShockSeverity === "severe" ? 3 : thermalShockSeverity === "moderate" ? 2 : 1;

  const isSuitable =
    productScore >= requiredScore && conditions.maxTempC <= product.maxOperatingTempC;

  let suitabilityRating: "unsuitable" | "marginal" | "acceptable" | "good" | "excellent";
  if (!isSuitable) {
    suitabilityRating = productScore === requiredScore - 1 ? "marginal" : "unsuitable";
  } else if (productScore > requiredScore + 1) {
    suitabilityRating = "excellent";
  } else if (productScore > requiredScore) {
    suitabilityRating = "good";
  } else {
    suitabilityRating = "acceptable";
  }

  let thermalStressRisk: "low" | "moderate" | "high" | "severe";
  if (thermalShockSeverity === "severe" && productScore < 3) {
    thermalStressRisk = "severe";
  } else if (thermalShockSeverity === "moderate" && productScore < 2) {
    thermalStressRisk = "high";
  } else if (
    thermalShockSeverity === "severe" ||
    (thermalShockSeverity === "moderate" && productScore === 2)
  ) {
    thermalStressRisk = "moderate";
  } else {
    thermalStressRisk = "low";
  }

  let estimatedCycleLife: number | null = null;
  if (productScore >= requiredScore) {
    const baseCycles = 10000;
    const tempFactor = Math.max(0.1, 1 - deltaT / 500);
    const rateFactor = Math.max(0.2, 1 - rampRate / 30);
    const frequencyFactor = Math.max(0.3, 1 - conditions.cyclesPerDay / 50);
    estimatedCycleLife = Math.round(
      baseCycles * tempFactor * rateFactor * frequencyFactor * (productScore / 2),
    );
  }

  if (thermalShockSeverity === "severe") {
    mitigationStrategies.push("Use smaller tile sizes to reduce thermal stress concentration");
    mitigationStrategies.push("Increase joint width to 5mm for thermal expansion");
    mitigationStrategies.push("Consider silicon carbide for better thermal conductivity");
    installationRequirements.push("Use high-temperature ceramic cement adhesive");
  }

  if (thermalShockSeverity === "moderate") {
    mitigationStrategies.push("Increase joint width to 3-4mm");
    mitigationStrategies.push("Pre-heat tiles before installation");
    installationRequirements.push("Use flexible epoxy or ceramic cement");
  }

  if (conditions.operatingEnvironment === "steam" || conditions.operatingEnvironment === "wet") {
    mitigationStrategies.push("Ensure tiles are fully dried before thermal cycling");
    warnings.push("Moisture in tile pores can cause spalling during rapid heating");
    installationRequirements.push("Allow 48h cure before wet/steam exposure");
  }

  if (rampRate > 15) {
    mitigationStrategies.push("Implement controlled heating ramp if possible");
    warnings.push("Rapid thermal ramp rate increases fracture risk");
  }

  installationRequirements.push("Align tile joints parallel to thermal gradient where possible");
  installationRequirements.push("Avoid constraining tiles - allow for expansion");
  installationRequirements.push("Pre-heat substrate to minimize initial thermal shock");

  if (conditions.maxTempC > product.maxOperatingTempC) {
    warnings.push(
      `Maximum temperature ${conditions.maxTempC}°C exceeds product rating ${product.maxOperatingTempC}°C`,
    );
  }

  const recommendedProducts = ceramicProducts
    .filter((p) => {
      const pScore = shockResistanceScore[p.thermalShockResistance];
      return pScore >= requiredScore && p.maxOperatingTempC >= conditions.maxTempC;
    })
    .sort((a, b) => {
      const aScore = shockResistanceScore[a.thermalShockResistance];
      const bScore = shockResistanceScore[b.thermalShockResistance];
      return bScore - aScore;
    })
    .slice(0, 5);

  return {
    isSuitable,
    suitabilityRating,
    recommendedProducts,
    thermalStressRisk,
    estimatedCycleLife,
    deltaT,
    thermalShockSeverity,
    mitigationStrategies,
    installationRequirements,
    warnings,
  };
}
