import type { CeramicProduct } from "@annix/product-data/ceramic/ceramicProducts";
import type { PaintProduct } from "@annix/product-data/paint/paintProducts";
import type { RubberProduct } from "@annix/product-data/rubber/rubberProducts";

export interface MaterialProperties {
  particleSize: "Fine" | "Medium" | "Coarse" | "VeryCoarse";
  particleShape: "Rounded" | "SubAngular" | "Angular";
  specificGravity: "Light" | "Medium" | "Heavy";
  hardnessClass: "Low" | "Medium" | "High";
  silicaContent: "Low" | "Moderate" | "High";
}

export interface ChemicalProperties {
  phRange: "Acidic" | "Neutral" | "Alkaline";
  chlorides: "Low" | "Moderate" | "High";
  temperatureRange: "Ambient" | "Elevated" | "High";
}

export interface FlowProperties {
  solidsPercent: "Low" | "Medium" | "High" | "VeryHigh";
  velocity: "Low" | "Medium" | "High";
  flowRegime: "Laminar" | "Turbulent";
  impactAngle: "Low" | "Mixed" | "High";
}

export interface EquipmentProperties {
  equipmentType: "Pipe" | "Tank" | "Chute" | "Hopper" | "Launder";
  impactZones: boolean;
  operatingPressure: "Low" | "Medium" | "High";
}

export interface MaterialTransferProfile {
  material: Partial<MaterialProperties>;
  chemistry: Partial<ChemicalProperties>;
  flow: Partial<FlowProperties>;
  equipment: Partial<EquipmentProperties>;
}

export interface DamageMechanisms {
  abrasion: "Low" | "Moderate" | "Severe";
  impact: "Low" | "Moderate" | "Severe";
  corrosion: "Low" | "Moderate" | "High";
  dominantMechanism: "Impact Abrasion" | "Sliding Abrasion" | "Corrosion" | "Mixed";
}

export interface LiningRecommendation {
  lining: string;
  liningType: string;
  thicknessRange: string;
  standardsBasis: string[];
  rationale: string;
  engineeringNotes: string[];
}

export interface ExternalEnvironmentProfile {
  installation: {
    type?: "AboveGround" | "Buried" | "Submerged" | "Splash";
    uvExposure?: "None" | "Moderate" | "High";
    mechanicalRisk?: "Low" | "Medium" | "High";
  };
  atmosphere: {
    iso12944Category?: "C1" | "C2" | "C3" | "C4" | "C5" | "CX";
    marineInfluence?: "None" | "Coastal" | "Offshore";
    industrialPollution?: "None" | "Moderate" | "Heavy";
  };
  soil: {
    soilType?: "Sandy" | "Clay" | "Rocky" | "Marshy";
    resistivity?: "VeryLow" | "Low" | "Medium" | "High";
    moisture?: "Dry" | "Normal" | "Wet" | "Saturated";
  };
  operating: {
    temperature?: "Ambient" | "Elevated" | "High" | "Cyclic";
    cathodicProtection?: boolean;
    serviceLife?: "Short" | "Medium" | "Long" | "Extended";
  };
}

export interface ExternalCoatingRecommendation {
  coating: string;
  coatingType: string;
  system: string;
  thicknessRange: string;
  standardsBasis: string[];
  rationale: string;
  engineeringNotes: string[];
}

export interface ExternalDamageMechanisms {
  atmosphericCorrosion: "Low" | "Moderate" | "High" | "Severe";
  soilCorrosion: "Low" | "Moderate" | "High" | "Severe";
  mechanicalDamage: "Low" | "Moderate" | "High";
  dominantMechanism: "Atmospheric" | "Soil/Buried" | "Marine" | "Mechanical" | "Mixed";
}

export function classifyDamageMechanisms(profile: MaterialTransferProfile): DamageMechanisms {
  const { material, chemistry, flow, equipment } = profile;

  const abrasionSeverity = (): "Low" | "Moderate" | "Severe" => {
    if (
      material.hardnessClass === "High" &&
      (flow.velocity === "High" || material.silicaContent === "High")
    ) {
      return "Severe";
    }
    if (
      material.hardnessClass === "Medium" ||
      flow.velocity === "Medium" ||
      material.particleShape === "Angular"
    ) {
      return "Moderate";
    }
    return "Low";
  };

  const impactSeverity = (): "Low" | "Moderate" | "Severe" => {
    if (flow.impactAngle === "High" && equipment.impactZones) {
      return "Severe";
    }
    if (
      flow.impactAngle === "Mixed" ||
      material.particleSize === "Coarse" ||
      material.particleSize === "VeryCoarse"
    ) {
      return "Moderate";
    }
    return "Low";
  };

  const corrosionSeverity = (): "Low" | "Moderate" | "High" => {
    if (chemistry.phRange === "Acidic" || chemistry.chlorides === "High") {
      return "High";
    }
    if (chemistry.chlorides === "Moderate" || chemistry.temperatureRange === "High") {
      return "Moderate";
    }
    return "Low";
  };

  const abrasion = abrasionSeverity();
  const impact = impactSeverity();
  const corrosion = corrosionSeverity();

  const dominantMechanism = (): "Impact Abrasion" | "Sliding Abrasion" | "Corrosion" | "Mixed" => {
    if (impact === "Severe") return "Impact Abrasion";
    if (abrasion === "Severe") return "Sliding Abrasion";
    if (corrosion === "High") return "Corrosion";
    return "Mixed";
  };

  return {
    abrasion,
    impact,
    corrosion,
    dominantMechanism: dominantMechanism(),
  };
}

export function recommendLining(
  profile: MaterialTransferProfile,
  damage: DamageMechanisms,
): LiningRecommendation {
  if (damage.impact === "Severe") {
    return {
      lining: "Rubber-Ceramic Composite",
      liningType: "Ceramic Lined",
      thicknessRange: "15–30 mm",
      standardsBasis: ["ASTM C1327", "SANS 1198:2013", "ISO 4649"],
      rationale: "High impact combined with abrasion requires composite protection",
      engineeringNotes: [
        "SANS 1198 Type 1 rubber backing absorbs impact energy",
        "Ceramic face provides wear resistance",
        "Consider 92% or 95% alumina tiles for severe applications",
        "Rubber backing: 40-50 IRHD for maximum impact absorption",
      ],
    };
  }

  if (damage.abrasion === "Severe") {
    return {
      lining: "Alumina Ceramic Tile",
      liningType: "Ceramic Lined",
      thicknessRange: "10–20 mm",
      standardsBasis: ["ASTM C1327", "ISO 14705", "ASTM C773"],
      rationale: "Severe sliding abrasion with moderate impact",
      engineeringNotes: [
        "96% or 99% alumina recommended for high silica content",
        "Hexagonal tiles provide better coverage in curved sections",
        "Ensure proper adhesive selection for operating temperature",
      ],
    };
  }

  if (damage.corrosion === "High") {
    const isHighTemp = profile.chemistry.temperatureRange === "High";
    const isAcidic = profile.chemistry.phRange === "Acidic";
    return {
      lining: isHighTemp
        ? "Type 2 Butyl (IIR)"
        : isAcidic
          ? "Type 5 CSM (Hypalon)"
          : "Type 1 Natural Rubber",
      liningType: "Rubber Lined",
      thicknessRange: "6–15 mm",
      standardsBasis: ["SANS 1198:2013", "SANS 1201:2005", "ASTM D412"],
      rationale:
        "Acidic or high chloride environment requires chemical-resistant lining per SANS 1198",
      engineeringNotes: [
        "SANS 1198 Type 2 (Butyl) for chemical resistance up to 120°C",
        "SANS 1198 Type 5 (CSM/Hypalon) for acid and ozone resistance",
        "Grade A (18+ MPa) recommended for high-stress applications",
        "50-60 IRHD hardness class for abrasion resistance",
      ],
    };
  }

  if (damage.abrasion === "Moderate" && profile.material.particleSize === "Fine") {
    return {
      lining: "Cast Polyurethane",
      liningType: "PU Lined",
      thicknessRange: "5–10 mm",
      standardsBasis: ["ASTM D412", "ASTM D2240", "ISO 4649"],
      rationale: "Fine particle abrasion with moderate severity",
      engineeringNotes: [
        "Excellent for fine particle slurries",
        "Low friction coefficient reduces buildup",
        "Shore hardness 70-85A typical for slurry applications",
      ],
    };
  }

  if (profile.chemistry.phRange === "Neutral" && damage.abrasion === "Low") {
    return {
      lining: "HDPE Lining",
      liningType: "HDPE Lined",
      thicknessRange: "3–8 mm",
      standardsBasis: ["ASTM D3350", "ISO 4427"],
      rationale: "Low wear, neutral chemistry - cost-effective protection",
      engineeringNotes: [
        "PE100 grade for improved pressure resistance",
        "Consider PE100-RC for stress crack resistance",
        "Suitable for non-abrasive slurries",
      ],
    };
  }

  return {
    lining: "Type 1 Natural Rubber (NR/SBR)",
    liningType: "Rubber Lined",
    thicknessRange: "6–12 mm",
    standardsBasis: ["SANS 1198:2013", "SANS 1201:2005", "ASTM D412"],
    rationale: "General-purpose protection per SANS 1198 Type 1 specification",
    engineeringNotes: [
      "SANS 1198 Type 1 (NR/SBR) for general industrial applications",
      "Grade B (14+ MPa) suitable for standard applications",
      "40-50 IRHD hardness class for impact absorption",
      "Autoclave vulcanization preferred per SANS 1201",
    ],
  };
}

export function hasCompleteProfile(profile: MaterialTransferProfile): boolean {
  const { material, chemistry, flow, equipment } = profile;
  return !!(
    material.particleSize &&
    material.particleShape &&
    material.hardnessClass &&
    chemistry.phRange &&
    flow.velocity &&
    flow.impactAngle &&
    equipment.equipmentType
  );
}

export function classifyExternalDamageMechanisms(
  profile: ExternalEnvironmentProfile,
): ExternalDamageMechanisms {
  const { installation, atmosphere, soil } = profile;

  const atmosphericSeverity = (): "Low" | "Moderate" | "High" | "Severe" => {
    if (atmosphere.iso12944Category === "CX" || atmosphere.marineInfluence === "Offshore") {
      return "Severe";
    }
    if (
      atmosphere.iso12944Category === "C5" ||
      atmosphere.marineInfluence === "Coastal" ||
      atmosphere.industrialPollution === "Heavy"
    ) {
      return "High";
    }
    if (
      atmosphere.iso12944Category === "C3" ||
      atmosphere.iso12944Category === "C4" ||
      atmosphere.industrialPollution === "Moderate"
    ) {
      return "Moderate";
    }
    return "Low";
  };

  const soilSeverity = (): "Low" | "Moderate" | "High" | "Severe" => {
    if (installation.type !== "Buried") return "Low";
    if (soil.resistivity === "VeryLow" && soil.moisture === "Saturated") {
      return "Severe";
    }
    if (
      soil.resistivity === "VeryLow" ||
      soil.resistivity === "Low" ||
      soil.moisture === "Wet" ||
      soil.moisture === "Saturated"
    ) {
      return "High";
    }
    if (soil.resistivity === "Medium" || soil.soilType === "Clay") {
      return "Moderate";
    }
    return "Low";
  };

  const mechanicalSeverity = (): "Low" | "Moderate" | "High" => {
    if (installation.mechanicalRisk === "High") return "High";
    if (installation.mechanicalRisk === "Medium" || installation.type === "Buried")
      return "Moderate";
    return "Low";
  };

  const atmospheric = atmosphericSeverity();
  const soilCorrosion = soilSeverity();
  const mechanical = mechanicalSeverity();

  const dominantMechanism = ():
    | "Atmospheric"
    | "Soil/Buried"
    | "Marine"
    | "Mechanical"
    | "Mixed" => {
    if (atmosphere.marineInfluence === "Offshore" || atmosphere.marineInfluence === "Coastal")
      return "Marine";
    if (installation.type === "Buried" && (soilCorrosion === "Severe" || soilCorrosion === "High"))
      return "Soil/Buried";
    if (atmospheric === "Severe" || atmospheric === "High") return "Atmospheric";
    if (mechanical === "High") return "Mechanical";
    return "Mixed";
  };

  return {
    atmosphericCorrosion: atmospheric,
    soilCorrosion,
    mechanicalDamage: mechanical,
    dominantMechanism: dominantMechanism(),
  };
}

export function recommendExternalCoating(
  profile: ExternalEnvironmentProfile,
  damage: ExternalDamageMechanisms,
): ExternalCoatingRecommendation {
  const { installation, operating } = profile;
  const isHighUV = installation.uvExposure === "High";

  const addUVTopcoatNote = (
    recommendation: ExternalCoatingRecommendation,
  ): ExternalCoatingRecommendation => {
    if (!isHighUV) return recommendation;

    const hasPolyurethane =
      recommendation.system.toLowerCase().includes("polyurethane") ||
      recommendation.system.toLowerCase().includes("pu ") ||
      recommendation.coating.toLowerCase().includes("polyurethane");

    if (!hasPolyurethane) {
      return {
        ...recommendation,
        system: `${recommendation.system} + Aliphatic Polyurethane UV topcoat (50-80μm)`,
        engineeringNotes: [
          ...recommendation.engineeringNotes,
          "High UV exposure: Aliphatic polyurethane topcoat required for UV resistance and color/gloss retention",
        ],
      };
    }
    return recommendation;
  };

  if (installation.type === "Buried") {
    if (damage.soilCorrosion === "Severe" || damage.soilCorrosion === "High") {
      return {
        coating: "Fusion Bonded Epoxy (FBE) or 3-Layer Polyethylene (3LPE)",
        coatingType: "Paint",
        system: "SA 2.5 blast (ISO 8501-1) → FBE: 350-500μm or 3LPE: 1.8-3.0mm total",
        thicknessRange: "350–3000 μm",
        standardsBasis: ["ISO 8501-1", "ISO 21809-1", "ISO 21809-2", "NACE SP0169", "AS/NZS 4822"],
        rationale:
          "Severe soil corrosivity requires heavy-duty pipeline coating with CP compatibility",
        engineeringNotes: [
          "Surface prep: SA 2.5 (ISO 8501-1) minimum - very thorough blast cleaning",
          "FBE provides excellent adhesion and CP compatibility",
          "3LPE recommended for rocky terrain or high mechanical stress",
          "Ensure holiday detection testing per NACE SP0188",
          "Field joint coating critical - use compatible shrink sleeves",
        ],
      };
    }
    return {
      coating: "Coal Tar Epoxy or Polyurethane Coating",
      coatingType: "Paint",
      system: "SA 2.5 blast (ISO 8501-1) → Primer + 2 coats, 400-600μm DFT",
      thicknessRange: "400–600 μm",
      standardsBasis: ["ISO 8501-1", "ISO 21809-3", "AWWA C222", "NACE SP0169"],
      rationale: "Moderate soil conditions with cathodic protection compatibility",
      engineeringNotes: [
        "Surface prep: SA 2.5 (ISO 8501-1) minimum - very thorough blast cleaning",
        "Coal tar epoxy for proven long-term performance",
        "Consider wrap coating for additional mechanical protection",
      ],
    };
  }

  if (damage.dominantMechanism === "Marine" || damage.atmosphericCorrosion === "Severe") {
    return addUVTopcoatNote({
      coating: "High-Build Epoxy System",
      coatingType: "Paint",
      system:
        "SA 2.5 blast (ISO 8501-1) → Zinc-rich primer + Epoxy MIO intermediate + Polyurethane topcoat",
      thicknessRange: "320–450 μm total DFT",
      standardsBasis: ["ISO 8501-1", "ISO 12944-5", "ISO 12944-6", "NORSOK M-501", "SSPC-PA 2"],
      rationale: "Marine/offshore environment requires maximum corrosion protection",
      engineeringNotes: [
        "Surface prep: SA 2.5 (ISO 8501-1) minimum - very thorough blast cleaning",
        "Zinc-rich primer (60-80μm) for cathodic protection",
        "Epoxy MIO intermediate (150-200μm) for barrier protection",
        "Polyurethane topcoat (60-80μm) for UV and gloss retention",
        "Consider thermal spray aluminium (TSA) for splash zones",
      ],
    });
  }

  if (damage.atmosphericCorrosion === "High") {
    return addUVTopcoatNote({
      coating: "Epoxy-Polyurethane System",
      coatingType: "Paint",
      system:
        "SA 2.5 blast (ISO 8501-1) → Zinc phosphate primer + Epoxy intermediate + Polyurethane topcoat",
      thicknessRange: "250–350 μm total DFT",
      standardsBasis: ["ISO 8501-1", "ISO 12944-5", "AS/NZS 2312.1", "SSPC-PA 2"],
      rationale: "Industrial or coastal atmosphere with high corrosion risk",
      engineeringNotes: [
        "Surface prep: SA 2.5 (ISO 8501-1) minimum - very thorough blast cleaning",
        "Zinc phosphate primer (50-75μm) for steel adhesion",
        "High-build epoxy intermediate (125-175μm)",
        "Aliphatic polyurethane topcoat for UV stability",
        "Recoat intervals per ISO 12944-9",
      ],
    });
  }

  if (installation.mechanicalRisk === "High" || installation.type === "Splash") {
    return addUVTopcoatNote({
      coating: "Rubber Coating or Polyurea",
      coatingType: "Rubber Lined",
      system: "SA 2.5 blast (ISO 8501-1) → Chloroprene rubber 3-6mm or Polyurea 1.5-3mm",
      thicknessRange: "1500–6000 μm",
      standardsBasis: ["ISO 8501-1", "ASTM D4541", "ASTM D2000", "ISO 4649"],
      rationale: "High mechanical stress or splash zone requires impact-resistant coating",
      engineeringNotes: [
        "Surface prep: SA 2.5 (ISO 8501-1) minimum - very thorough blast cleaning",
        "Chloroprene (Neoprene) rubber for abrasion and weathering",
        "Polyurea for rapid application and seamless coverage",
        "Shore A hardness 50-70 for impact absorption",
        "Consider armoring at support points",
      ],
    });
  }

  if (damage.atmosphericCorrosion === "Moderate") {
    return addUVTopcoatNote({
      coating: "Alkyd or Acrylic System",
      coatingType: "Paint",
      system: "SA 2.5 blast (ISO 8501-1) → Alkyd primer + Alkyd/Acrylic topcoat",
      thicknessRange: "150–250 μm total DFT",
      standardsBasis: ["ISO 8501-1", "ISO 12944-5", "AS/NZS 2312.1"],
      rationale: "Moderate atmospheric exposure - cost-effective protection",
      engineeringNotes: [
        "Surface prep: SA 2.5 (ISO 8501-1) minimum - very thorough blast cleaning",
        "Suitable for C2-C3 environments",
        "Alkyd primer (50-75μm) on prepared steel",
        "Acrylic topcoat for better UV resistance than alkyd",
        "Regular maintenance inspection recommended",
      ],
    });
  }

  if (operating.temperature === "Elevated" || operating.temperature === "High") {
    return addUVTopcoatNote({
      coating: "Silicone or Epoxy Phenolic",
      coatingType: "Paint",
      system: "SA 2.5 blast (ISO 8501-1) → Heat-resistant primer + Silicone topcoat",
      thicknessRange: "75–150 μm total DFT",
      standardsBasis: ["ISO 8501-1", "ISO 12944-5", "ASTM D6695"],
      rationale: "Elevated temperature service requires heat-resistant coating",
      engineeringNotes: [
        "Surface prep: SA 2.5 (ISO 8501-1) minimum - very thorough blast cleaning",
        "Silicone coatings for temperatures up to 540°C",
        "Epoxy phenolic for temperatures up to 200°C with chemical resistance",
        "Inorganic zinc silicate primer for high-temp applications",
        "Cure requirements critical for performance",
      ],
    });
  }

  if (installation.uvExposure === "None" && damage.atmosphericCorrosion === "Low") {
    return {
      coating: "Hot-Dip Galvanizing",
      coatingType: "Galvanized",
      system: "HDG per ISO 1461 (no blasting required - pickling process)",
      thicknessRange: "45–85 μm (depends on steel thickness)",
      standardsBasis: ["ISO 1461", "ASTM A123", "AS/NZS 4680"],
      rationale: "Indoor or sheltered environment with low corrosion risk",
      engineeringNotes: [
        "Surface prep: Chemical cleaning & pickling (no blast cleaning required)",
        "Minimum 45μm for steel <1.5mm, 85μm for steel >6mm",
        "Self-healing zinc protection",
        "Can be duplex coated (galvanized + paint) for extended life",
        "Ensure proper drainage design to avoid wet storage stain",
      ],
    };
  }

  return addUVTopcoatNote({
    coating: "Standard Epoxy System",
    coatingType: "Paint",
    system: "SA 2.5 blast (ISO 8501-1) → Epoxy primer + Epoxy topcoat",
    thicknessRange: "200–300 μm total DFT",
    standardsBasis: ["ISO 8501-1", "ISO 12944-5", "SSPC-PA 2"],
    rationale: "General-purpose protection for mild environments",
    engineeringNotes: [
      "Surface prep: SA 2.5 (ISO 8501-1) minimum - very thorough blast cleaning",
      "Epoxy primer (75-100μm) for adhesion",
      "High-build epoxy topcoat (125-200μm)",
      "Good chemical and abrasion resistance",
      "Note: Epoxy may chalk under UV - consider PU topcoat for exposed areas",
    ],
  });
}

export function hasCompleteExternalProfile(profile: ExternalEnvironmentProfile): boolean {
  const { installation, atmosphere, operating } = profile;
  return !!(installation.type && atmosphere.iso12944Category && operating.serviceLife);
}

export function deriveTemperatureCategory(tempC: number | undefined | null): string | undefined {
  if (tempC === undefined || tempC === null) return undefined;
  if (tempC < -20 || tempC > 60) {
    if (tempC >= 60 && tempC <= 120) return "Elevated";
    if (tempC > 120 && tempC <= 200) return "High";
    if (tempC > 200) return "High";
    return "Ambient";
  }
  return "Ambient";
}

export type {
  AdhesiveConditions,
  AdhesiveRecommendation as CeramicAdhesiveRecommendation,
  ApplicationType,
  CeramicLiningRequirements,
  CeramicMaterial,
  CeramicProduct,
  CeramicSupplier,
  CompositeSystemConfig,
  CompositeSystemRecommendation,
  EquipmentGeometryType,
  ImpactZoneDefinition,
  ImpactZoneRecommendation,
  RecommendedCeramicLining,
  ThermalCyclingConditions,
  ThermalCyclingResult,
  TileLayoutGeometry,
  TileLayoutResult,
  TileShape,
} from "@annix/product-data/ceramic";
export {
  allCeramicProducts,
  bestCeramicForImpactZones,
  bestCeramicForSlidingAbrasion,
  buildCompositeSystem,
  calculateTileLayout,
  ceramicProductById,
  ceramicProducts,
  ceramicProductsByAluminaContent,
  ceramicProductsByMaterial,
  ceramicProductsBySupplier,
  ceramicProductsByWearRating,
  ceramicProductsForApplication,
  ceramicProductsForTemperature,
  checkThermalCycling,
  compareCeramicMaterials,
  highImpactCeramicProducts,
  identifyImpactZones,
  recommendCeramicLining,
  recommendForChutes,
  recommendForCyclones as recommendCeramicForCyclones,
  recommendForHighTemperature,
  recommendForImpactZones,
  recommendForSlidingAbrasion,
  selectCeramicAdhesive,
} from "@annix/product-data/ceramic";
export type {
  CorrosivityCategory,
  PaintProduct,
  PaintSupplier,
} from "@annix/product-data/paint/paintProducts";
export {
  compatiblePrimers,
  compatibleTopcoats,
  paintProducts,
  primersForEnvironment,
  productsForCorrosivity,
  productsForTemperature,
  surfaceTolerantProducts,
  topcoatsForEnvironment,
} from "@annix/product-data/paint/paintProducts";
export type {
  CoatingSystemRequirements,
  CompatibilityValidation,
  CoverageCalculation,
  CoverageResult,
  CureScheduleInput,
  CureScheduleResult,
  ISO12944Durability,
  ISO12944DurabilityResult,
  ISO12944Environment,
  NORSOKSystem,
  NORSOKSystemNumber,
  OvercoatWindow,
  OvercoatWindowResult,
  RecommendedCoatingSystem,
  SurfacePrepStandard,
} from "@annix/product-data/paint/paintSystemRecommendations";
export {
  allNORSOKSystems,
  allSurfacePrepStandards,
  calculateCoverage,
  calculateCureSchedule,
  calculateISO12944Durability,
  checkOvercoatWindow,
  generateNORSOKSystem,
  highTempSystemRecommendation,
  mapSurfacePrepStandards,
  recommendCoatingSystem,
  recommendPrimersForCategory,
  recommendTopcoatsForPrimer,
  surfacePrepForCorrosivity,
  systemDftSummary,
  validateMultiCoatCompatibility,
} from "@annix/product-data/paint/paintSystemRecommendations";
export type {
  AbrasionResistance,
  AdhesiveRecommendation,
  CureMethodRecommendation,
  DamageMechanismProfile,
  EquipmentGeometry,
  HardnessClass,
  PolymerBase,
  RecommendedRubberLining,
  RubberLiningRequirements,
  RubberProduct,
  RubberSupplier,
  SANS1198Classification,
  SANS1198ComplianceResult,
  SANS1198Grade,
  SANS1198Requirements,
  SANS1198Type,
  SubstrateCondition,
  ThicknessOptimization,
  WearConditions,
  WearLifeEstimate,
} from "@annix/product-data/rubber";
export {
  allRubberProducts,
  bestAbrasionResistantProducts,
  checkSANS1198Compliance,
  checkSANS1201Compliance,
  estimateWearLife,
  highTensileProducts,
  optimizeThickness,
  recommendCureMethod,
  recommendForCyclones,
  recommendForDryAbrasion,
  recommendForPipesAndChutes,
  recommendForWetSlurry,
  recommendRubberLining,
  rubberProductByCompoundCode,
  rubberProductById,
  rubberProducts,
  rubberProductsByHardness,
  rubberProductsByPolymer,
  rubberProductsBySANS1198Grade,
  rubberProductsBySANS1198Type,
  rubberProductsBySupplier,
  rubberProductsForAbrasion,
  rubberProductsForTemperature,
  selectAdhesiveSystem,
} from "@annix/product-data/rubber";

export type BudgetTier = "economy" | "standard" | "premium";

export type SupplierRegion = "south-africa" | "europe" | "usa" | "asia" | "global";

export interface SupplierInfo {
  name: string;
  region: SupplierRegion;
  tier: BudgetTier;
  leadTimeDays: number;
  localStock: boolean;
}

export interface BudgetFilterConfig {
  tier: BudgetTier;
  allowUpgrade: boolean;
  maxPriceMultiplier?: number;
}

export interface SupplierPreference {
  preferredSuppliers: string[];
  excludedSuppliers: string[];
  weightMultiplier: number;
}

export interface RegionalFilterConfig {
  allowedRegions: SupplierRegion[];
  requireLocalStock: boolean;
  maxLeadTimeDays?: number;
}

export interface TemperatureCyclingConfig {
  minTempC: number;
  maxTempC: number;
  cyclesPerDay: number;
  rampRateCPerMin: number;
  holdTimeMinutes: number;
  environment: "dry" | "wet" | "steam" | "chemical";
}

export interface CrossModuleFilterResult<T> {
  filtered: T[];
  excluded: { item: T; reason: string }[];
  appliedFilters: string[];
}

export interface TemperatureCyclingAssessment {
  productId: string;
  productName: string;
  productType: "paint" | "rubber" | "ceramic";
  isSuitable: boolean;
  suitabilityScore: number;
  thermalStressRating: "low" | "moderate" | "high" | "severe";
  concerns: string[];
  recommendations: string[];
}

const SUPPLIER_INFO: Record<string, SupplierInfo> = {
  Jotun: { name: "Jotun", region: "europe", tier: "premium", leadTimeDays: 14, localStock: true },
  Sigma: { name: "Sigma", region: "europe", tier: "premium", leadTimeDays: 14, localStock: true },
  Hempel: { name: "Hempel", region: "europe", tier: "premium", leadTimeDays: 14, localStock: true },
  PPG: { name: "PPG", region: "usa", tier: "premium", leadTimeDays: 21, localStock: false },
  Carboline: {
    name: "Carboline",
    region: "usa",
    tier: "premium",
    leadTimeDays: 21,
    localStock: false,
  },
  International: {
    name: "International",
    region: "europe",
    tier: "premium",
    leadTimeDays: 14,
    localStock: true,
  },
  "Sherwin-Williams": {
    name: "Sherwin-Williams",
    region: "usa",
    tier: "standard",
    leadTimeDays: 21,
    localStock: false,
  },
  StonCor: {
    name: "StonCor",
    region: "usa",
    tier: "standard",
    leadTimeDays: 21,
    localStock: false,
  },
  Generic: {
    name: "Generic",
    region: "global",
    tier: "economy",
    leadTimeDays: 7,
    localStock: true,
  },

  "REMA TIP TOP": {
    name: "REMA TIP TOP",
    region: "europe",
    tier: "premium",
    leadTimeDays: 14,
    localStock: true,
  },
  "AU Industries": {
    name: "AU Industries",
    region: "south-africa",
    tier: "standard",
    leadTimeDays: 7,
    localStock: true,
  },
  "S&N Rubber": {
    name: "S&N Rubber",
    region: "south-africa",
    tier: "standard",
    leadTimeDays: 7,
    localStock: true,
  },
  "Weir Minerals": {
    name: "Weir Minerals",
    region: "global",
    tier: "premium",
    leadTimeDays: 14,
    localStock: true,
  },
  Impilo: {
    name: "Impilo",
    region: "south-africa",
    tier: "standard",
    leadTimeDays: 7,
    localStock: true,
  },
  Truco: {
    name: "Truco",
    region: "south-africa",
    tier: "standard",
    leadTimeDays: 5,
    localStock: true,
  },
  Zenith: {
    name: "Zenith",
    region: "south-africa",
    tier: "economy",
    leadTimeDays: 5,
    localStock: true,
  },
  "Rubber Inc": {
    name: "Rubber Inc",
    region: "south-africa",
    tier: "economy",
    leadTimeDays: 5,
    localStock: true,
  },

  "TITAN Industrial": {
    name: "TITAN Industrial",
    region: "south-africa",
    tier: "premium",
    leadTimeDays: 7,
    localStock: true,
  },
  "HUDCO WearLine": {
    name: "HUDCO WearLine",
    region: "south-africa",
    tier: "standard",
    leadTimeDays: 7,
    localStock: true,
  },
  Multotec: {
    name: "Multotec",
    region: "south-africa",
    tier: "premium",
    leadTimeDays: 7,
    localStock: true,
  },
  Ceresist: {
    name: "Ceresist",
    region: "south-africa",
    tier: "standard",
    leadTimeDays: 7,
    localStock: true,
  },
  "HMA Wear Solutions": {
    name: "HMA Wear Solutions",
    region: "south-africa",
    tier: "standard",
    leadTimeDays: 7,
    localStock: true,
  },
};

const TIER_ORDER: Record<BudgetTier, number> = {
  economy: 1,
  standard: 2,
  premium: 3,
};

function supplierTier(supplierName: string): BudgetTier {
  return SUPPLIER_INFO[supplierName]?.tier || "standard";
}

function supplierRegion(supplierName: string): SupplierRegion {
  return SUPPLIER_INFO[supplierName]?.region || "global";
}

function supplierLeadTime(supplierName: string): number {
  return SUPPLIER_INFO[supplierName]?.leadTimeDays || 14;
}

function hasLocalStock(supplierName: string): boolean {
  return SUPPLIER_INFO[supplierName]?.localStock ?? false;
}

export function filterByBudgetTier<T extends { supplier: string }>(
  products: T[],
  config: BudgetFilterConfig,
): CrossModuleFilterResult<T> {
  const appliedFilters: string[] = [`Budget tier: ${config.tier}`];
  const filtered: T[] = [];
  const excluded: { item: T; reason: string }[] = [];

  const targetTierOrder = TIER_ORDER[config.tier];

  products.forEach((product) => {
    const productTier = supplierTier(product.supplier);
    const productTierOrder = TIER_ORDER[productTier];

    if (productTierOrder === targetTierOrder) {
      filtered.push(product);
    } else if (config.allowUpgrade && productTierOrder > targetTierOrder) {
      filtered.push(product);
      appliedFilters.push(`Upgraded from ${config.tier} to ${productTier}: ${product.supplier}`);
    } else if (productTierOrder < targetTierOrder) {
      excluded.push({
        item: product,
        reason: `Product tier (${productTier}) below requested tier (${config.tier})`,
      });
    } else {
      excluded.push({
        item: product,
        reason: `Product tier (${productTier}) above requested tier (${config.tier}) and upgrades not allowed`,
      });
    }
  });

  return { filtered, excluded, appliedFilters };
}

export function applySupplierPreference<T extends { supplier: string; id: string }>(
  products: T[],
  preference: SupplierPreference,
): { ranked: T[]; scores: Map<string, number> } {
  const scores = new Map<string, number>();

  const filteredProducts = products.filter((product) => {
    if (preference.excludedSuppliers.includes(product.supplier)) {
      return false;
    }
    return true;
  });

  filteredProducts.forEach((product) => {
    let score = 1.0;

    if (preference.preferredSuppliers.includes(product.supplier)) {
      score *= preference.weightMultiplier;
    }

    const preferredIndex = preference.preferredSuppliers.indexOf(product.supplier);
    if (preferredIndex >= 0) {
      score += (preference.preferredSuppliers.length - preferredIndex) * 0.1;
    }

    scores.set(product.id, score);
  });

  const ranked = [...filteredProducts].sort((a, b) => {
    const scoreA = scores.get(a.id) || 1.0;
    const scoreB = scores.get(b.id) || 1.0;
    return scoreB - scoreA;
  });

  return { ranked, scores };
}

export function filterByRegionalAvailability<T extends { supplier: string }>(
  products: T[],
  config: RegionalFilterConfig,
): CrossModuleFilterResult<T> {
  const appliedFilters: string[] = [`Regions: ${config.allowedRegions.join(", ")}`];
  const filtered: T[] = [];
  const excluded: { item: T; reason: string }[] = [];

  if (config.requireLocalStock) {
    appliedFilters.push("Requiring local stock");
  }

  if (config.maxLeadTimeDays !== undefined) {
    appliedFilters.push(`Max lead time: ${config.maxLeadTimeDays} days`);
  }

  products.forEach((product) => {
    const region = supplierRegion(product.supplier);
    const leadTime = supplierLeadTime(product.supplier);
    const localStock = hasLocalStock(product.supplier);

    if (!config.allowedRegions.includes(region) && region !== "global") {
      excluded.push({
        item: product,
        reason: `Supplier region (${region}) not in allowed regions`,
      });
      return;
    }

    if (config.requireLocalStock && !localStock) {
      excluded.push({
        item: product,
        reason: "No local stock available",
      });
      return;
    }

    if (config.maxLeadTimeDays !== undefined && leadTime > config.maxLeadTimeDays) {
      excluded.push({
        item: product,
        reason: `Lead time (${leadTime} days) exceeds maximum (${config.maxLeadTimeDays} days)`,
      });
      return;
    }

    filtered.push(product);
  });

  return { filtered, excluded, appliedFilters };
}

export function supplierInfo(supplierName: string): SupplierInfo | null {
  return SUPPLIER_INFO[supplierName] || null;
}

export function allSuppliersByRegion(region: SupplierRegion): string[] {
  return Object.entries(SUPPLIER_INFO)
    .filter(([_, info]) => info.region === region || info.region === "global")
    .map(([name]) => name);
}

export function allSuppliersByTier(tier: BudgetTier): string[] {
  return Object.entries(SUPPLIER_INFO)
    .filter(([_, info]) => info.tier === tier)
    .map(([name]) => name);
}

export function assessPaintForTemperatureCycling(
  product: PaintProduct,
  config: TemperatureCyclingConfig,
): TemperatureCyclingAssessment {
  const concerns: string[] = [];
  const recommendations: string[] = [];
  let suitabilityScore = 100;

  const deltaT = config.maxTempC - config.minTempC;

  if (config.maxTempC > product.heatResistance.continuousC) {
    suitabilityScore -= 40;
    concerns.push(
      `Max cycling temp (${config.maxTempC}°C) exceeds continuous rating (${product.heatResistance.continuousC}°C)`,
    );
  }

  if (config.maxTempC > product.heatResistance.peakC) {
    suitabilityScore -= 30;
    concerns.push(`Max cycling temp exceeds peak rating (${product.heatResistance.peakC}°C)`);
  }

  if (deltaT > 100) {
    suitabilityScore -= 20;
    concerns.push(`Large temperature swing (${deltaT}°C) may cause coating stress`);
    recommendations.push("Consider flexible coating system or stress-relief primer");
  }

  if (config.rampRateCPerMin > 5) {
    suitabilityScore -= 15;
    concerns.push("Rapid temperature changes may cause thermal shock");
    recommendations.push("Implement controlled heating/cooling ramps if possible");
  }

  if (config.cyclesPerDay > 10) {
    suitabilityScore -= 10;
    concerns.push("High cycle frequency accelerates coating fatigue");
    recommendations.push("Plan for more frequent inspection intervals");
  }

  if (config.environment === "wet" || config.environment === "steam") {
    if (
      product.heatResistance.immersionC !== null &&
      config.maxTempC > product.heatResistance.immersionC
    ) {
      suitabilityScore -= 25;
      concerns.push("Temperature exceeds immersion rating in wet/steam environment");
    }
    recommendations.push("Ensure coating is fully cured before wet cycling exposure");
  }

  if (config.environment === "chemical") {
    suitabilityScore -= 10;
    concerns.push("Chemical exposure combined with cycling increases degradation risk");
    recommendations.push("Verify chemical compatibility at both temperature extremes");
  }

  if (product.genericType === "epoxy" || product.genericType === "epoxy-mio") {
    if (deltaT > 80) {
      recommendations.push(
        "Consider polysiloxane or silicone for better thermal cycling resistance",
      );
    }
  }

  if (product.genericType === "high-temp-silicone") {
    suitabilityScore += 10;
    recommendations.push("Silicone coating well-suited for thermal cycling");
  }

  const thermalStressRating: "low" | "moderate" | "high" | "severe" =
    suitabilityScore >= 80
      ? "low"
      : suitabilityScore >= 60
        ? "moderate"
        : suitabilityScore >= 40
          ? "high"
          : "severe";

  return {
    productId: product.id,
    productName: product.name,
    productType: "paint",
    isSuitable: suitabilityScore >= 50,
    suitabilityScore: Math.max(0, Math.min(100, suitabilityScore)),
    thermalStressRating,
    concerns,
    recommendations,
  };
}

export function assessRubberForTemperatureCycling(
  product: RubberProduct,
  config: TemperatureCyclingConfig,
): TemperatureCyclingAssessment {
  const concerns: string[] = [];
  const recommendations: string[] = [];
  let suitabilityScore = 100;

  const deltaT = config.maxTempC - config.minTempC;

  if (config.maxTempC > product.maxOperatingTempC) {
    suitabilityScore -= 50;
    concerns.push(
      `Max cycling temp (${config.maxTempC}°C) exceeds max operating temp (${product.maxOperatingTempC}°C)`,
    );
  }

  if (config.minTempC < product.minOperatingTempC) {
    suitabilityScore -= 30;
    concerns.push(
      `Min cycling temp (${config.minTempC}°C) below min operating temp (${product.minOperatingTempC}°C)`,
    );
    recommendations.push("Low temperatures cause rubber embrittlement");
  }

  if (deltaT > 60) {
    suitabilityScore -= 15;
    concerns.push("Large temperature swing may cause adhesive bond stress");
    recommendations.push("Verify adhesive system rated for thermal cycling");
  }

  if (config.rampRateCPerMin > 3) {
    suitabilityScore -= 10;
    concerns.push("Rapid temperature changes stress rubber-to-substrate bond");
  }

  if (config.cyclesPerDay > 20) {
    suitabilityScore -= 15;
    concerns.push("High cycle frequency accelerates rubber aging");
    recommendations.push("Consider thicker lining for extended cycle life");
  }

  if (config.environment === "steam") {
    if (
      product.polymerBase !== "EPDM" &&
      product.polymerBase !== "IIR" &&
      product.polymerBase !== "BIIR"
    ) {
      suitabilityScore -= 25;
      concerns.push("Steam environment requires EPDM or butyl rubber");
      recommendations.push("Switch to EPDM compound for steam service");
    }
  }

  if (product.polymerBase === "EPDM") {
    suitabilityScore += 10;
    recommendations.push("EPDM provides good thermal cycling resistance");
  }

  if (product.polymerBase === "NR" || product.polymerBase === "NR/SBR") {
    if (config.maxTempC > 70) {
      suitabilityScore -= 15;
      concerns.push("Natural rubber degrades faster with thermal cycling above 70°C");
    }
  }

  const thermalStressRating: "low" | "moderate" | "high" | "severe" =
    suitabilityScore >= 80
      ? "low"
      : suitabilityScore >= 60
        ? "moderate"
        : suitabilityScore >= 40
          ? "high"
          : "severe";

  return {
    productId: product.id,
    productName: product.name,
    productType: "rubber",
    isSuitable: suitabilityScore >= 50,
    suitabilityScore: Math.max(0, Math.min(100, suitabilityScore)),
    thermalStressRating,
    concerns,
    recommendations,
  };
}

export function assessCeramicForTemperatureCycling(
  product: CeramicProduct,
  config: TemperatureCyclingConfig,
): TemperatureCyclingAssessment {
  const concerns: string[] = [];
  const recommendations: string[] = [];
  let suitabilityScore = 100;

  const deltaT = config.maxTempC - config.minTempC;

  if (config.maxTempC > product.maxOperatingTempC) {
    suitabilityScore -= 50;
    concerns.push(
      `Max cycling temp (${config.maxTempC}°C) exceeds max operating temp (${product.maxOperatingTempC}°C)`,
    );
  }

  const shockResistanceScore: Record<string, number> = {
    poor: 1,
    fair: 2,
    good: 3,
    excellent: 4,
  };

  const productShockScore = shockResistanceScore[product.thermalShockResistance];

  if (deltaT > 200 && productShockScore < 3) {
    suitabilityScore -= 30;
    concerns.push("Large temperature swing with limited thermal shock resistance");
    recommendations.push("Use silicon carbide or upgrade to better thermal shock resistant tile");
  }

  if (config.rampRateCPerMin > 10 && productShockScore < 3) {
    suitabilityScore -= 25;
    concerns.push("Rapid temperature changes may cause ceramic cracking");
    recommendations.push("Implement controlled heating/cooling or use smaller tiles");
  }

  if (config.cyclesPerDay > 50) {
    suitabilityScore -= 20;
    concerns.push("Very high cycle frequency - ceramic fatigue likely");
  }

  if (productShockScore >= 3) {
    suitabilityScore += 10;
  }

  if (product.material === "silicon-carbide") {
    suitabilityScore += 15;
    recommendations.push(
      "Silicon carbide excellent for thermal cycling due to high thermal conductivity",
    );
  }

  if (config.environment === "wet" || config.environment === "steam") {
    concerns.push("Moisture ingress in tile pores can cause spalling during rapid heating");
    recommendations.push("Ensure tiles are fully dried before thermal cycling");
  }

  if (product.compatibleAdhesives.includes("rubber-backing") && deltaT > 100) {
    concerns.push("Rubber backing may fail under extreme thermal cycling");
    recommendations.push("Consider ceramic cement adhesive for high delta-T applications");
  }

  recommendations.push("Use wider tile joints (4-5mm) to accommodate thermal expansion");
  recommendations.push("Avoid constraining tiles - allow for expansion movement");

  const thermalStressRating: "low" | "moderate" | "high" | "severe" =
    suitabilityScore >= 80
      ? "low"
      : suitabilityScore >= 60
        ? "moderate"
        : suitabilityScore >= 40
          ? "high"
          : "severe";

  return {
    productId: product.id,
    productName: product.name,
    productType: "ceramic",
    isSuitable: suitabilityScore >= 50,
    suitabilityScore: Math.max(0, Math.min(100, suitabilityScore)),
    thermalStressRating,
    concerns,
    recommendations,
  };
}

export function rankProductsForTemperatureCycling<T extends { id: string; supplier: string }>(
  assessments: TemperatureCyclingAssessment[],
  products: T[],
): T[] {
  const productMap = new Map(products.map((p) => [p.id, p]));

  const sortedAssessments = [...assessments]
    .filter((a) => a.isSuitable)
    .sort((a, b) => b.suitabilityScore - a.suitabilityScore);

  return sortedAssessments
    .map((a) => productMap.get(a.productId))
    .filter((p): p is T => p !== undefined);
}
