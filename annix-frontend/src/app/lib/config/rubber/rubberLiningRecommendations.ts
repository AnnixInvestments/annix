import type {
  AbrasionResistance,
  AdhesiveSystem,
  CureMethod,
  PolymerBase,
  RubberProduct,
  SANS1198Grade,
  SANS1198Type,
} from "./rubberProducts";
import { rubberProducts, rubberProductsForAbrasion } from "./rubberProducts";

export interface SANS1198Requirements {
  type: SANS1198Type;
  grade: SANS1198Grade;
  hardnessClass: number;
  minTensileMPa: number;
  minElongationPercent: number;
  maxAbrasionLossMm3: number;
}

export interface SANS1198ComplianceResult {
  isCompliant: boolean;
  standard: "SANS 1198:2013" | "SANS 1201:2005";
  type: SANS1198Type;
  grade: SANS1198Grade;
  hardnessClass: number;
  checks: {
    tensileStrength: { required: number; actual: number; pass: boolean };
    elongation: { required: number; actual: number; pass: boolean };
    abrasionLoss: { required: number; actual: number; pass: boolean };
    hardness: { required: number; actual: number; tolerance: number; pass: boolean };
  };
  failures: string[];
  recommendations: string[];
}

export interface EquipmentGeometry {
  type: "pipe" | "tank" | "vessel" | "chute" | "hopper" | "cyclone" | "pump" | "valve";
  internalDiameterMm?: number;
  lengthMm?: number;
  accessForAutoclave: boolean;
  canBeRemoved: boolean;
  complexGeometry: boolean;
}

export interface CureMethodRecommendation {
  recommendedMethod: CureMethod;
  alternativeMethods: CureMethod[];
  rationale: string;
  requirements: string[];
  warnings: string[];
}

export interface SubstrateCondition {
  material:
    | "carbon-steel"
    | "stainless-steel"
    | "cast-iron"
    | "concrete"
    | "fiberglass"
    | "aluminum";
  surfaceCondition: "new" | "corroded" | "previously-lined" | "contaminated";
  operatingTempC: number;
  immersionService: boolean;
  chemicalExposure?: "mild" | "moderate" | "severe";
}

export interface AdhesiveRecommendation {
  primaryAdhesive: AdhesiveSystem;
  alternativeAdhesives: AdhesiveSystem[];
  primerRequired: boolean;
  applicationMethod: string;
  potLifeHours: number;
  openTimeMinutes: number;
  cureConditions: string;
  warnings: string[];
}

export interface WearConditions {
  abrasionType: AbrasionResistance;
  particleSizeMm: number;
  particleHardnessMohs: number;
  slurryConcentrationPercent?: number;
  velocityMps: number;
  impactAngleDegrees: number;
  operatingHoursPerDay: number;
}

export interface WearLifeEstimate {
  estimatedLifeMonths: number;
  estimatedLifeRange: { min: number; max: number };
  wearRateMmPerMonth: number;
  confidenceLevel: "low" | "medium" | "high";
  factors: string[];
  recommendations: string[];
}

export interface DamageMechanismProfile {
  slidingAbrasionSeverity: "low" | "moderate" | "severe";
  impactAbrasionSeverity: "low" | "moderate" | "severe";
  erosionSeverity: "low" | "moderate" | "severe";
  chemicalAttack: "none" | "mild" | "moderate" | "severe";
  temperatureStress: "ambient" | "elevated" | "cyclic";
}

export interface ThicknessOptimization {
  recommendedThicknessMm: number;
  thicknessRange: { min: number; max: number };
  rationale: string;
  zoneRecommendations: { zone: string; thicknessMm: number; reason: string }[];
  warnings: string[];
}

export interface RubberLiningRequirements {
  abrasionType: AbrasionResistance;
  maxOperatingTempC?: number;
  impactAbsorption?: "low" | "medium" | "high";
  sans1198Type?: SANS1198Type;
  sans1198Grade?: SANS1198Grade;
  chemicalExposure?: {
    oils?: boolean;
    acids?: boolean;
    alkalis?: boolean;
    oxidisers?: boolean;
  };
}

export interface RecommendedRubberLining {
  primary: RubberProduct | null;
  alternatives: RubberProduct[];
  thicknessRecommendation: string;
  systemDescription: string;
  engineeringNotes: string[];
  warnings: string[];
}

function filterByChemicalCompatibility(
  products: RubberProduct[],
  chemicalExposure: RubberLiningRequirements["chemicalExposure"],
): RubberProduct[] {
  if (!chemicalExposure) return products;

  return products.filter((p) => {
    const limitations = p.limitations.map((l) => l.toLowerCase());
    if (chemicalExposure.oils && limitations.some((l) => l.includes("oil"))) {
      return false;
    }
    if (chemicalExposure.oxidisers && limitations.some((l) => l.includes("oxidi"))) {
      return false;
    }
    return true;
  });
}

function hardnessForImpact(impact: "low" | "medium" | "high"): { min: number; max: number } {
  const hardnessMap: Record<string, { min: number; max: number }> = {
    high: { min: 30, max: 45 },
    medium: { min: 40, max: 55 },
    low: { min: 50, max: 70 },
  };
  return hardnessMap[impact] || { min: 35, max: 50 };
}

function thicknessForApplication(
  abrasionType: AbrasionResistance,
  impact: "low" | "medium" | "high" | undefined,
): string {
  if (impact === "high") {
    return "12-25mm (high impact zones require thicker lining)";
  }
  if (abrasionType === "wet-slurry") {
    return "6-15mm (wet slurry service)";
  }
  if (abrasionType === "dry") {
    return "6-12mm (dry abrasion service)";
  }
  return "6-12mm (general service)";
}

export function recommendRubberLining(
  requirements: RubberLiningRequirements,
): RecommendedRubberLining {
  const {
    abrasionType,
    maxOperatingTempC,
    impactAbsorption,
    sans1198Type,
    sans1198Grade,
    chemicalExposure,
  } = requirements;

  let candidates = rubberProductsForAbrasion(abrasionType);

  if (maxOperatingTempC !== undefined) {
    candidates = candidates.filter((p) => p.maxOperatingTempC >= maxOperatingTempC);
  }

  if (sans1198Type !== undefined) {
    candidates = candidates.filter((p) => p.sans1198?.type === sans1198Type);
  }

  if (sans1198Grade !== undefined) {
    candidates = candidates.filter((p) => p.sans1198?.grade === sans1198Grade);
  }

  if (impactAbsorption) {
    const { min, max } = hardnessForImpact(impactAbsorption);
    candidates = candidates.filter(
      (p) =>
        p.hardnessShoreA >= min - p.hardnessTolerance &&
        p.hardnessShoreA <= max + p.hardnessTolerance,
    );
  }

  candidates = filterByChemicalCompatibility(candidates, chemicalExposure);

  const sortedByAbrasion = [...candidates].sort((a, b) => a.abrasionLossMm3 - b.abrasionLossMm3);
  const primary = sortedByAbrasion[0] || null;
  const alternatives = sortedByAbrasion.slice(1, 4);

  const warnings: string[] = [];
  if (chemicalExposure?.oils) {
    warnings.push("Oil exposure specified - verify rubber compatibility with specific oil type");
  }
  if (chemicalExposure?.acids) {
    warnings.push(
      "Acid exposure may require specialist rubber compound (IIR/Butyl or CSM/Hypalon)",
    );
  }
  if (maxOperatingTempC && maxOperatingTempC > 70) {
    warnings.push("Operating temperature exceeds 70°C - consider EPDM or specialist compounds");
  }

  const engineeringNotes: string[] = [];
  if (primary) {
    engineeringNotes.push(
      `SANS 1198 Classification: Type ${primary.sans1198?.type} Grade ${primary.sans1198?.grade} Class ${primary.sans1198?.hardnessClass}`,
    );
    engineeringNotes.push(`Abrasion loss: ${primary.abrasionLossMm3} mm³ (lower is better)`);
    engineeringNotes.push(`Tensile strength: ${primary.tensileMPa} MPa`);
    engineeringNotes.push(`Elongation: ${primary.elongationPercent}%`);
    if (primary.abrasionResistance === "wet-slurry") {
      engineeringNotes.push("Optimised for wet slurry abrasion - excellent for mineral processing");
    }
    if (primary.abrasionResistance === "dry") {
      engineeringNotes.push(
        "Optimised for dry abrasion - suitable for cyclones and dry material handling",
      );
    }
  }

  return {
    primary,
    alternatives,
    thicknessRecommendation: thicknessForApplication(abrasionType, impactAbsorption),
    systemDescription: primary
      ? `${primary.supplier} ${primary.name} (${primary.compoundCode})`
      : "No suitable product found",
    engineeringNotes,
    warnings,
  };
}

export function recommendForWetSlurry(
  impactLevel: "low" | "medium" | "high" = "medium",
): RecommendedRubberLining {
  return recommendRubberLining({
    abrasionType: "wet-slurry",
    impactAbsorption: impactLevel,
    sans1198Grade: "A",
  });
}

export function recommendForDryAbrasion(
  impactLevel: "low" | "medium" | "high" = "medium",
): RecommendedRubberLining {
  return recommendRubberLining({
    abrasionType: "dry",
    impactAbsorption: impactLevel,
  });
}

export function recommendForCyclones(): RecommendedRubberLining {
  return recommendRubberLining({
    abrasionType: "dry",
    impactAbsorption: "high",
  });
}

export function recommendForPipesAndChutes(
  slurryType: "wet" | "dry" = "wet",
): RecommendedRubberLining {
  return recommendRubberLining({
    abrasionType: slurryType === "wet" ? "wet-slurry" : "dry",
    impactAbsorption: "medium",
    sans1198Grade: "A",
  });
}

export function allRubberProducts(): RubberProduct[] {
  return rubberProducts;
}

export function rubberProductById(id: string): RubberProduct | undefined {
  return rubberProducts.find((p) => p.id === id);
}

export function rubberProductByCompoundCode(code: string): RubberProduct | undefined {
  return rubberProducts.find((p) => p.compoundCode === code);
}

const SANS1198_REQUIREMENTS: Record<string, SANS1198Requirements> = {
  "1-A-35": {
    type: 1,
    grade: "A",
    hardnessClass: 35,
    minTensileMPa: 18,
    minElongationPercent: 450,
    maxAbrasionLossMm3: 150,
  },
  "1-A-40": {
    type: 1,
    grade: "A",
    hardnessClass: 40,
    minTensileMPa: 18,
    minElongationPercent: 400,
    maxAbrasionLossMm3: 150,
  },
  "1-A-50": {
    type: 1,
    grade: "A",
    hardnessClass: 50,
    minTensileMPa: 17,
    minElongationPercent: 350,
    maxAbrasionLossMm3: 180,
  },
  "1-A-60": {
    type: 1,
    grade: "A",
    hardnessClass: 60,
    minTensileMPa: 15,
    minElongationPercent: 300,
    maxAbrasionLossMm3: 200,
  },
  "1-A-70": {
    type: 1,
    grade: "A",
    hardnessClass: 70,
    minTensileMPa: 14,
    minElongationPercent: 250,
    maxAbrasionLossMm3: 250,
  },
  "1-B-35": {
    type: 1,
    grade: "B",
    hardnessClass: 35,
    minTensileMPa: 14,
    minElongationPercent: 400,
    maxAbrasionLossMm3: 200,
  },
  "1-B-40": {
    type: 1,
    grade: "B",
    hardnessClass: 40,
    minTensileMPa: 14,
    minElongationPercent: 350,
    maxAbrasionLossMm3: 200,
  },
  "1-B-50": {
    type: 1,
    grade: "B",
    hardnessClass: 50,
    minTensileMPa: 12,
    minElongationPercent: 300,
    maxAbrasionLossMm3: 250,
  },
  "1-B-60": {
    type: 1,
    grade: "B",
    hardnessClass: 60,
    minTensileMPa: 10,
    minElongationPercent: 250,
    maxAbrasionLossMm3: 300,
  },
  "1-B-70": {
    type: 1,
    grade: "B",
    hardnessClass: 70,
    minTensileMPa: 9,
    minElongationPercent: 200,
    maxAbrasionLossMm3: 350,
  },
  "2-A-50": {
    type: 2,
    grade: "A",
    hardnessClass: 50,
    minTensileMPa: 10,
    minElongationPercent: 350,
    maxAbrasionLossMm3: 250,
  },
  "2-B-50": {
    type: 2,
    grade: "B",
    hardnessClass: 50,
    minTensileMPa: 7,
    minElongationPercent: 300,
    maxAbrasionLossMm3: 300,
  },
  "2-C-50": {
    type: 2,
    grade: "C",
    hardnessClass: 50,
    minTensileMPa: 5,
    minElongationPercent: 250,
    maxAbrasionLossMm3: 350,
  },
  "2-C-60": {
    type: 2,
    grade: "C",
    hardnessClass: 60,
    minTensileMPa: 5,
    minElongationPercent: 200,
    maxAbrasionLossMm3: 400,
  },
};

export function checkSANS1198Compliance(
  product: RubberProduct,
  targetType?: SANS1198Type,
  targetGrade?: SANS1198Grade,
): SANS1198ComplianceResult {
  const failures: string[] = [];
  const recommendations: string[] = [];

  if (!product.sans1198) {
    return {
      isCompliant: false,
      standard: "SANS 1198:2013",
      type: targetType || 1,
      grade: targetGrade || "B",
      hardnessClass: (Math.round(product.hardnessShoreA / 10) * 10) as 35 | 40 | 50 | 60 | 70,
      checks: {
        tensileStrength: { required: 0, actual: product.tensileMPa, pass: false },
        elongation: { required: 0, actual: product.elongationPercent, pass: false },
        abrasionLoss: { required: 0, actual: product.abrasionLossMm3, pass: false },
        hardness: {
          required: 0,
          actual: product.hardnessShoreA,
          tolerance: product.hardnessTolerance,
          pass: false,
        },
      },
      failures: ["Product does not have SANS 1198 classification"],
      recommendations: ["Consider using a SANS 1198 certified compound for compliance"],
    };
  }

  const type = targetType || product.sans1198.type;
  const grade = targetGrade || product.sans1198.grade;
  const hardnessClass = product.sans1198.hardnessClass;
  const key = `${type}-${grade}-${hardnessClass}`;
  const requirements = SANS1198_REQUIREMENTS[key];

  if (!requirements) {
    return {
      isCompliant: false,
      standard: "SANS 1198:2013",
      type,
      grade,
      hardnessClass,
      checks: {
        tensileStrength: { required: 0, actual: product.tensileMPa, pass: false },
        elongation: { required: 0, actual: product.elongationPercent, pass: false },
        abrasionLoss: { required: 0, actual: product.abrasionLossMm3, pass: false },
        hardness: {
          required: hardnessClass,
          actual: product.hardnessShoreA,
          tolerance: product.hardnessTolerance,
          pass: false,
        },
      },
      failures: [`No requirements found for Type ${type} Grade ${grade} Class ${hardnessClass}`],
      recommendations: ["Verify classification against SANS 1198:2013 Table 1"],
    };
  }

  const tensilePass = product.tensileMPa >= requirements.minTensileMPa;
  const elongationPass = product.elongationPercent >= requirements.minElongationPercent;
  const abrasionPass = product.abrasionLossMm3 <= requirements.maxAbrasionLossMm3;
  const hardnessPass =
    product.hardnessShoreA >= hardnessClass - product.hardnessTolerance &&
    product.hardnessShoreA <= hardnessClass + product.hardnessTolerance;

  if (!tensilePass)
    failures.push(
      `Tensile strength ${product.tensileMPa} MPa below minimum ${requirements.minTensileMPa} MPa`,
    );
  if (!elongationPass)
    failures.push(
      `Elongation ${product.elongationPercent}% below minimum ${requirements.minElongationPercent}%`,
    );
  if (!abrasionPass)
    failures.push(
      `Abrasion loss ${product.abrasionLossMm3} mm³ exceeds maximum ${requirements.maxAbrasionLossMm3} mm³`,
    );
  if (!hardnessPass)
    failures.push(
      `Hardness ${product.hardnessShoreA} outside ${hardnessClass}±${product.hardnessTolerance} IRHD`,
    );

  if (grade === "A" && !tensilePass) {
    recommendations.push("Consider Grade B classification with lower tensile requirement");
  }
  if (!abrasionPass && product.abrasionLossMm3 < requirements.maxAbrasionLossMm3 * 1.2) {
    recommendations.push(
      "Marginal abrasion failure - consider increased thickness for equivalent wear life",
    );
  }

  return {
    isCompliant: tensilePass && elongationPass && abrasionPass && hardnessPass,
    standard: "SANS 1198:2013",
    type,
    grade,
    hardnessClass,
    checks: {
      tensileStrength: {
        required: requirements.minTensileMPa,
        actual: product.tensileMPa,
        pass: tensilePass,
      },
      elongation: {
        required: requirements.minElongationPercent,
        actual: product.elongationPercent,
        pass: elongationPass,
      },
      abrasionLoss: {
        required: requirements.maxAbrasionLossMm3,
        actual: product.abrasionLossMm3,
        pass: abrasionPass,
      },
      hardness: {
        required: hardnessClass,
        actual: product.hardnessShoreA,
        tolerance: product.hardnessTolerance,
        pass: hardnessPass,
      },
    },
    failures,
    recommendations,
  };
}

export function checkSANS1201Compliance(
  product: RubberProduct,
  cureMethod: CureMethod,
): { isCompliant: boolean; requirements: string[]; failures: string[] } {
  const requirements = [
    "SANS 1201:2005 Clause 4.2 - Surface preparation Sa 2.5 minimum",
    "SANS 1201:2005 Clause 4.3 - Adhesive application within 4 hours of blasting",
    "SANS 1201:2005 Clause 5.2 - Cure pressure 280-350 kPa for autoclave",
    "SANS 1201:2005 Clause 5.3 - Cure time minimum 90 minutes at temperature",
    "SANS 1201:2005 Clause 6.1 - Holiday detection at 10kV per mm thickness",
  ];

  const failures: string[] = [];

  if (cureMethod === "cold-vulcanization" && product.sans1198?.grade === "A") {
    failures.push(
      "Cold vulcanization not recommended for Grade A applications per SANS 1201 Clause 5.1",
    );
  }

  if (product.polymerBase === "PU") {
    failures.push("Polyurethane linings require separate specification (not covered by SANS 1201)");
  }

  return {
    isCompliant: failures.length === 0,
    requirements,
    failures,
  };
}

export function recommendCureMethod(geometry: EquipmentGeometry): CureMethodRecommendation {
  const warnings: string[] = [];
  const requirements: string[] = [];

  if (geometry.accessForAutoclave && geometry.canBeRemoved) {
    requirements.push("Equipment must fit in autoclave chamber");
    requirements.push("Ensure uniform heat distribution during cure");
    requirements.push("Cure cycle: 280-350 kPa at 140-155°C for 90-120 minutes");

    return {
      recommendedMethod: "autoclave",
      alternativeMethods: ["hot-press"],
      rationale:
        "Autoclave curing provides highest bond strength and is preferred for removable equipment",
      requirements,
      warnings,
    };
  }

  if (geometry.accessForAutoclave && !geometry.canBeRemoved) {
    if (geometry.type === "tank" || geometry.type === "vessel") {
      requirements.push("Internal steam/pressure curing capability required");
      requirements.push("Temperature monitoring at multiple points");
      requirements.push("Minimum 6-hour hold at cure temperature");

      return {
        recommendedMethod: "autoclave",
        alternativeMethods: ["cold-vulcanization"],
        rationale: "In-situ autoclave curing using internal steam for fixed vessels",
        requirements,
        warnings: ["Ensure vessel can withstand cure pressure internally"],
      };
    }
  }

  if (!geometry.accessForAutoclave && geometry.complexGeometry) {
    requirements.push("Surface preparation within 4 hours of adhesive application");
    requirements.push("Ambient temperature 15-30°C during cure");
    requirements.push("Minimum 14-day cure before service (21 days optimal)");
    requirements.push("Protect from moisture during cure period");
    warnings.push("Cold cure provides 70-80% of autoclave bond strength");
    warnings.push("Not recommended for high-impact or critical applications");

    return {
      recommendedMethod: "cold-vulcanization",
      alternativeMethods: [],
      rationale:
        "Cold vulcanization required for complex geometry or field application where autoclave access is not possible",
      requirements,
      warnings,
    };
  }

  if (geometry.internalDiameterMm && geometry.internalDiameterMm < 150) {
    warnings.push("Small diameter may limit access for quality application");
    requirements.push("Consider pre-lined pipe sections where possible");
  }

  const recommendedMethod: CureMethod = geometry.canBeRemoved ? "autoclave" : "cold-vulcanization";

  return {
    recommendedMethod,
    alternativeMethods:
      recommendedMethod === "autoclave" ? ["hot-press", "cold-vulcanization"] : [],
    rationale: geometry.canBeRemoved
      ? "Autoclave preferred for removable components"
      : "Cold vulcanization for fixed installations",
    requirements,
    warnings,
  };
}

export function selectAdhesiveSystem(
  substrate: SubstrateCondition,
  rubberType: PolymerBase,
): AdhesiveRecommendation {
  const warnings: string[] = [];

  const adhesiveForSubstrate: Record<string, AdhesiveSystem> = {
    "carbon-steel": "chemosil",
    "stainless-steel": "cilbond",
    "cast-iron": "chemosil",
    concrete: "generic-rubber-adhesive",
    fiberglass: "cilbond",
    aluminum: "cilbond",
  };

  const primaryAdhesive = adhesiveForSubstrate[substrate.material] || "chemosil";
  const alternativeAdhesives: AdhesiveSystem[] = [];

  if (primaryAdhesive === "chemosil") {
    alternativeAdhesives.push("cilbond", "megum");
  } else if (primaryAdhesive === "cilbond") {
    alternativeAdhesives.push("chemosil", "thixon");
  }

  let primerRequired = true;
  let applicationMethod = "Brush or spray application";
  const potLifeHours = 8;
  const openTimeMinutes = 30;
  const cureConditions = "Autoclave cure at 140-155°C, 280-350 kPa";

  if (substrate.surfaceCondition === "corroded") {
    warnings.push("Corroded substrate requires thorough blast cleaning to Sa 2.5 minimum");
    primerRequired = true;
  }

  if (substrate.surfaceCondition === "previously-lined") {
    warnings.push("Remove all previous lining and adhesive residue before re-lining");
    warnings.push("Solvent wash required after mechanical removal");
  }

  if (substrate.surfaceCondition === "contaminated") {
    warnings.push("Degrease and solvent wash required before blasting");
    warnings.push("Oil contamination may require alkaline cleaning");
  }

  if (substrate.operatingTempC > 80) {
    warnings.push("High temperature service - verify adhesive temperature rating");
    if (substrate.operatingTempC > 120) {
      warnings.push("Consider high-temperature adhesive system (Chemosil 597 or equivalent)");
    }
  }

  if (substrate.immersionService) {
    warnings.push("Immersion service requires primer coat for moisture barrier");
    primerRequired = true;
  }

  if (rubberType === "IIR" || rubberType === "BIIR") {
    warnings.push("Butyl rubber requires specialized adhesive system");
    applicationMethod = "Two-coat system with tie gum";
  }

  if (rubberType === "EPDM") {
    warnings.push("EPDM adhesion can be challenging - use EPDM-specific primer");
  }

  if (substrate.material === "stainless-steel") {
    warnings.push("Stainless steel requires passivation removal before bonding");
    applicationMethod = "Acid etch or sweep blast + immediate primer application";
  }

  return {
    primaryAdhesive,
    alternativeAdhesives,
    primerRequired,
    applicationMethod,
    potLifeHours,
    openTimeMinutes,
    cureConditions,
    warnings,
  };
}

export function estimateWearLife(
  product: RubberProduct,
  conditions: WearConditions,
  liningThicknessMm: number,
): WearLifeEstimate {
  const factors: string[] = [];
  const recommendations: string[] = [];

  const baseWearRate = product.abrasionLossMm3 / 1000;

  let severityMultiplier = 1.0;

  if (conditions.particleSizeMm > 10) {
    severityMultiplier *= 1.5;
    factors.push("Coarse particles (>10mm) increase wear rate by ~50%");
  } else if (conditions.particleSizeMm < 1) {
    severityMultiplier *= 0.7;
    factors.push("Fine particles (<1mm) reduce wear rate by ~30%");
  }

  if (conditions.particleHardnessMohs > 7) {
    severityMultiplier *= 1.8;
    factors.push("Hard particles (>7 Mohs) significantly increase wear");
  } else if (conditions.particleHardnessMohs < 5) {
    severityMultiplier *= 0.6;
    factors.push("Soft particles (<5 Mohs) reduce wear rate");
  }

  if (conditions.velocityMps > 5) {
    severityMultiplier *= (conditions.velocityMps / 3) ** 2;
    factors.push(
      `High velocity (${conditions.velocityMps} m/s) - wear increases with velocity squared`,
    );
  }

  if (conditions.impactAngleDegrees > 60) {
    severityMultiplier *= 1.4;
    factors.push("High impact angle (>60°) increases erosive wear");
  } else if (conditions.impactAngleDegrees < 30) {
    severityMultiplier *= 0.8;
    factors.push("Low impact angle favors sliding abrasion");
  }

  if (conditions.slurryConcentrationPercent && conditions.slurryConcentrationPercent > 40) {
    severityMultiplier *= 1.3;
    factors.push("High solids concentration increases wear");
  }

  if (conditions.abrasionType === "wet-slurry" && product.abrasionResistance !== "wet-slurry") {
    severityMultiplier *= 1.5;
    recommendations.push("Consider wet-slurry optimized compound for improved life");
  }

  if (conditions.abrasionType === "dry" && product.abrasionResistance !== "dry") {
    severityMultiplier *= 1.3;
    recommendations.push("Consider dry-abrasion optimized compound");
  }

  const wearRateMmPerMonth =
    baseWearRate * severityMultiplier * (conditions.operatingHoursPerDay / 8);
  const estimatedLifeMonths = liningThicknessMm / wearRateMmPerMonth;

  const variability = 0.3;
  const estimatedLifeRange = {
    min: Math.round(estimatedLifeMonths * (1 - variability)),
    max: Math.round(estimatedLifeMonths * (1 + variability)),
  };

  let confidenceLevel: "low" | "medium" | "high" = "medium";
  if (factors.length > 4) {
    confidenceLevel = "low";
    recommendations.push("Multiple severe factors - consider pilot installation for validation");
  } else if (factors.length <= 2) {
    confidenceLevel = "high";
  }

  if (estimatedLifeMonths < 6) {
    recommendations.push("Short predicted life - consider increased thickness or harder compound");
  }

  if (estimatedLifeMonths > 60) {
    recommendations.push("Long predicted life - thickness may be over-specified");
  }

  return {
    estimatedLifeMonths: Math.round(estimatedLifeMonths),
    estimatedLifeRange,
    wearRateMmPerMonth: Math.round(wearRateMmPerMonth * 100) / 100,
    confidenceLevel,
    factors,
    recommendations,
  };
}

export function optimizeThickness(
  damage: DamageMechanismProfile,
  product: RubberProduct,
): ThicknessOptimization {
  const warnings: string[] = [];
  const zoneRecommendations: { zone: string; thicknessMm: number; reason: string }[] = [];

  let baseThickness = 6;
  let rationale = "Standard thickness for general service";

  if (damage.slidingAbrasionSeverity === "severe") {
    baseThickness = Math.max(baseThickness, 12);
    rationale = "Increased thickness for severe sliding abrasion";
  } else if (damage.slidingAbrasionSeverity === "moderate") {
    baseThickness = Math.max(baseThickness, 9);
  }

  if (damage.impactAbrasionSeverity === "severe") {
    baseThickness = Math.max(baseThickness, 15);
    rationale = "High thickness for severe impact absorption";
    if (product.hardnessShoreA > 50) {
      warnings.push("Consider softer compound (35-45 Shore A) for impact zones");
    }
  } else if (damage.impactAbrasionSeverity === "moderate") {
    baseThickness = Math.max(baseThickness, 12);
  }

  if (damage.erosionSeverity === "severe") {
    baseThickness = Math.max(baseThickness, 10);
    rationale = "Increased thickness for erosion protection";
  }

  if (damage.chemicalAttack === "severe") {
    baseThickness = Math.max(baseThickness, 10);
    warnings.push("Chemical attack may reduce effective life - consider specialist compound");
  } else if (damage.chemicalAttack === "moderate") {
    baseThickness = Math.max(baseThickness, 8);
  }

  if (damage.temperatureStress === "cyclic") {
    baseThickness = Math.max(baseThickness, 10);
    warnings.push("Thermal cycling may cause adhesion fatigue - ensure proper cure");
  }

  if (damage.impactAbrasionSeverity === "severe" || damage.impactAbrasionSeverity === "moderate") {
    zoneRecommendations.push({
      zone: "Impact zones",
      thicknessMm: baseThickness + 6,
      reason: "Additional thickness at direct impact points",
    });
  }

  if (damage.slidingAbrasionSeverity === "severe") {
    zoneRecommendations.push({
      zone: "Wear surfaces",
      thicknessMm: baseThickness + 3,
      reason: "Additional thickness on primary wear surfaces",
    });
  }

  zoneRecommendations.push({
    zone: "Transition zones",
    thicknessMm: baseThickness,
    reason: "Standard thickness in low-stress areas",
  });

  const minThickness = Math.max(product.thicknessRange.minMm, 3);
  const maxThickness = Math.min(product.thicknessRange.maxMm, 25);

  const recommendedThickness = Math.min(Math.max(baseThickness, minThickness), maxThickness);

  if (recommendedThickness < baseThickness) {
    warnings.push(`Recommended thickness limited by product availability (max ${maxThickness}mm)`);
  }

  return {
    recommendedThicknessMm: recommendedThickness,
    thicknessRange: { min: minThickness, max: maxThickness },
    rationale,
    zoneRecommendations,
    warnings,
  };
}
