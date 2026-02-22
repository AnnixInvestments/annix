import type { CorrosivityCategory, GenericType } from "./paintProducts";
import type { ISO12944Durability } from "./paintSystemRecommendations";

export type ISO12944Part =
  | "part1-scope"
  | "part2-environment"
  | "part3-design"
  | "part4-surface-types"
  | "part5-systems"
  | "part6-lab-testing"
  | "part7-execution"
  | "part8-new-work"
  | "part9-maintenance";

export type EnvironmentType =
  | "rural"
  | "urban"
  | "industrial"
  | "coastal"
  | "offshore"
  | "immersed-freshwater"
  | "immersed-seawater"
  | "buried-soil"
  | "chemical";

export type StructureType =
  | "building-external"
  | "building-internal"
  | "bridge"
  | "tank-external"
  | "tank-internal"
  | "pipe-external"
  | "pipe-internal"
  | "offshore-structure"
  | "marine-vessel";

export interface ISO12944Part2Environment {
  atmosphericCategory: CorrosivityCategory;
  immersionCategory?: "Im1" | "Im2" | "Im3" | "Im4";
  temperatureRange: { minC: number; maxC: number };
  humidityConditions: "dry" | "condensing" | "wet";
  pollutants?: string[];
  uvExposure: "low" | "moderate" | "high";
}

export interface ISO12944Part3Design {
  accessForMaintenance: "good" | "limited" | "none";
  edgeTreatment: "rounded" | "chamfered" | "sharp";
  drainageProvision: boolean;
  weldQuality: "ground-smooth" | "acceptable" | "rough";
  boltedConnections: boolean;
  ventilationAdequate: boolean;
}

export interface ISO12944Part4Surface {
  steelGrade: "carbon-steel" | "weathering-steel" | "stainless" | "galvanized" | "duplex";
  initialCondition: "A" | "B" | "C" | "D";
  millScalePresent: boolean;
  existingCoating?: {
    type: string;
    condition: "good" | "fair" | "poor";
    adhesion: "good" | "poor";
  };
}

export interface ISO12944Part5System {
  primerType: GenericType;
  intermediateType?: GenericType;
  topcoatType?: GenericType;
  totalNominalDftUm: number;
  numberOfCoats: number;
}

export interface ISO12944Part6TestResult {
  testMethod: string;
  result: "pass" | "fail";
  value?: number;
  requirement?: string;
}

export interface ISO12944Part7Execution {
  surfacePrepGrade: string;
  ambientConditions: {
    temperatureC: number;
    relativeHumidityPercent: number;
    dewPointC: number;
    steelTempC: number;
  };
  applicationMethod: "brush" | "roller" | "airless-spray" | "conventional-spray";
  coatThicknessControl: boolean;
  cureTimeRespected: boolean;
}

export interface ISO12944Part8NewWork {
  specificationNumber: string;
  systemReference: string;
  warrantyYears: number;
  inspectionLevel: "basic" | "intermediate" | "comprehensive";
}

export interface ISO12944Part9Maintenance {
  currentCondition: "Ri0" | "Ri1" | "Ri2" | "Ri3" | "Ri4" | "Ri5";
  repairStrategy: "spot-repair" | "overcoat" | "full-removal";
  compatibilityChecked: boolean;
  accessConstraints?: string;
}

export interface ISO12944Validation {
  isCompliant: boolean;
  partResults: {
    part: ISO12944Part;
    compliant: boolean;
    issues: string[];
    recommendations: string[];
  }[];
  overallRating: "compliant" | "minor-issues" | "non-compliant";
}

export function validateISO12944Part1Scope(
  structureType: StructureType,
  corrosivityCategory: CorrosivityCategory,
): { applicable: boolean; notes: string[] } {
  const notes: string[] = [];

  notes.push("ISO 12944-1:2017 defines scope and terms for protective paint systems");
  notes.push(`Structure type: ${structureType}`);
  notes.push(`Corrosivity category: ${corrosivityCategory}`);

  const highCorrosivityStructures: StructureType[] = [
    "offshore-structure",
    "marine-vessel",
    "tank-internal",
    "pipe-internal",
  ];

  if (
    highCorrosivityStructures.includes(structureType) &&
    !["C5", "CX"].includes(corrosivityCategory)
  ) {
    notes.push("Warning: Structure type typically requires C5 or CX corrosivity rating");
  }

  return { applicable: true, notes };
}

export function validateISO12944Part2(environment: ISO12944Part2Environment): {
  valid: boolean;
  issues: string[];
  category: CorrosivityCategory;
} {
  const issues: string[] = [];

  if (environment.temperatureRange.maxC > 120 && environment.atmosphericCategory !== "CX") {
    issues.push("High temperature (>120°C) may require CX category or special high-temp coatings");
  }

  if (
    environment.humidityConditions === "condensing" &&
    ["C1", "C2"].includes(environment.atmosphericCategory)
  ) {
    issues.push("Condensing conditions typically warrant C3 or higher category");
  }

  if (environment.immersionCategory) {
    const immersionRequirements: Record<string, string> = {
      Im1: "Freshwater immersion - requires epoxy or equivalent",
      Im2: "Seawater immersion - requires high-build epoxy or glass flake",
      Im3: "Soil burial - requires coal tar epoxy or FBE",
      Im4: "Chemical immersion - requires chemical-resistant epoxy or vinyl ester",
    };
    issues.push(`Immersion requirement: ${immersionRequirements[environment.immersionCategory]}`);
  }

  return {
    valid: issues.length === 0,
    issues,
    category: environment.atmosphericCategory,
  };
}

export function validateISO12944Part3(design: ISO12944Part3Design): {
  score: number;
  issues: string[];
  recommendations: string[];
} {
  const issues: string[] = [];
  const recommendations: string[] = [];
  let score = 100;

  if (design.accessForMaintenance === "none") {
    score -= 20;
    issues.push("No access for future maintenance");
    recommendations.push(
      "Consider higher durability system (H or VH) to extend maintenance interval",
    );
  } else if (design.accessForMaintenance === "limited") {
    score -= 10;
    recommendations.push("Plan maintenance access points during design phase");
  }

  if (design.edgeTreatment === "sharp") {
    score -= 15;
    issues.push("Sharp edges cause thin coating coverage");
    recommendations.push("Round or chamfer all edges to minimum 2mm radius per ISO 12944-3");
  }

  if (!design.drainageProvision) {
    score -= 10;
    issues.push("Inadequate drainage promotes corrosion");
    recommendations.push("Provide drainage holes or slopes to prevent water ponding");
  }

  if (design.weldQuality === "rough") {
    score -= 15;
    issues.push("Rough welds difficult to coat adequately");
    recommendations.push("Grind welds smooth and free of spatter");
  }

  if (design.boltedConnections) {
    recommendations.push("Seal bolt heads and consider shop-applied primer for faying surfaces");
  }

  if (!design.ventilationAdequate) {
    score -= 10;
    issues.push("Poor ventilation causes moisture retention");
    recommendations.push("Provide ventilation for enclosed spaces");
  }

  return { score: Math.max(0, score), issues, recommendations };
}

export function validateISO12944Part4(
  surface: ISO12944Part4Surface,
  targetPrepGrade: string,
): { achievable: boolean; prepRequirements: string[]; warnings: string[] } {
  const prepRequirements: string[] = [];
  const warnings: string[] = [];

  const initialConditionDescriptions: Record<string, string> = {
    A: "Steel surface largely covered with adhering mill scale, little or no rust",
    B: "Steel surface with mill scale starting to flake, slight rusting",
    C: "Steel surface with mill scale rusted away or scraped, slight pitting",
    D: "Steel surface with mill scale rusted away, general pitting visible",
  };

  prepRequirements.push(
    `Initial condition ${surface.initialCondition}: ${initialConditionDescriptions[surface.initialCondition]}`,
  );

  if (surface.steelGrade === "galvanized") {
    prepRequirements.push("Degrease and apply T-wash or etch primer for galvanized steel");
    warnings.push("Avoid abrasive blasting on thin galvanized coatings");
  }

  if (surface.steelGrade === "weathering-steel") {
    prepRequirements.push("Remove loose rust layer but stable patina may be retained");
  }

  if (surface.millScalePresent && ["Sa 2.5", "Sa 3"].includes(targetPrepGrade)) {
    prepRequirements.push("Abrasive blasting required to remove mill scale completely");
  }

  if (surface.existingCoating) {
    if (
      surface.existingCoating.condition === "poor" ||
      surface.existingCoating.adhesion === "poor"
    ) {
      prepRequirements.push("Remove existing coating completely before recoating");
      warnings.push("Test adhesion of existing coating in multiple locations");
    } else {
      prepRequirements.push("Feather edges and abrade existing coating for adhesion");
    }
  }

  const achievable =
    surface.initialCondition !== "D" || ["Sa 2.5", "Sa 3"].includes(targetPrepGrade);

  return { achievable, prepRequirements, warnings };
}

export function validateISO12944Part5(
  system: ISO12944Part5System,
  corrosivity: CorrosivityCategory,
  durability: ISO12944Durability,
): { compliant: boolean; minimumDftRequired: number; issues: string[] } {
  const issues: string[] = [];

  const minDftTable: Record<CorrosivityCategory, Record<ISO12944Durability, number>> = {
    C1: { L: 80, M: 80, H: 120, VH: 160 },
    C2: { L: 80, M: 120, H: 160, VH: 200 },
    C3: { L: 120, M: 160, H: 200, VH: 280 },
    C4: { L: 160, M: 200, H: 240, VH: 320 },
    C5: { L: 200, M: 280, H: 320, VH: 400 },
    CX: { L: 280, M: 320, H: 400, VH: 500 },
  };

  const minimumDftRequired = minDftTable[corrosivity][durability];

  if (system.totalNominalDftUm < minimumDftRequired) {
    issues.push(
      `Total DFT ${system.totalNominalDftUm}μm is below minimum ${minimumDftRequired}μm for ${corrosivity}/${durability}`,
    );
  }

  const recommendedCoats: Record<CorrosivityCategory, number> = {
    C1: 1,
    C2: 2,
    C3: 2,
    C4: 3,
    C5: 3,
    CX: 3,
  };

  if (system.numberOfCoats < recommendedCoats[corrosivity]) {
    issues.push(
      `${system.numberOfCoats} coats may be insufficient for ${corrosivity} - recommend minimum ${recommendedCoats[corrosivity]}`,
    );
  }

  const zincPrimers: GenericType[] = ["zinc-silicate", "zinc-rich-epoxy"];
  if (["C4", "C5", "CX"].includes(corrosivity) && !zincPrimers.includes(system.primerType)) {
    issues.push("Zinc-rich primer recommended for C4/C5/CX categories");
  }

  return {
    compliant: issues.length === 0,
    minimumDftRequired,
    issues,
  };
}

export function validateISO12944Part6Tests(testResults: ISO12944Part6TestResult[]): {
  allPassed: boolean;
  summary: string[];
} {
  const summary: string[] = [];
  const failedTests = testResults.filter((t) => t.result === "fail");

  const requiredTests = [
    "ISO 2409 - Cross-cut adhesion",
    "ISO 4624 - Pull-off adhesion",
    "ISO 2812-2 - Water immersion",
    "ISO 9227 - Salt spray resistance",
    "ISO 6270-1 - Humidity resistance",
  ];

  summary.push("ISO 12944-6 Laboratory Test Performance:");
  testResults.forEach((test) => {
    const status = test.result === "pass" ? "PASS" : "FAIL";
    const valueStr = test.value !== undefined ? ` (${test.value})` : "";
    summary.push(`  ${test.testMethod}: ${status}${valueStr}`);
  });

  if (failedTests.length > 0) {
    summary.push(`Failed tests: ${failedTests.map((t) => t.testMethod).join(", ")}`);
  }

  return {
    allPassed: failedTests.length === 0,
    summary,
  };
}

export function validateISO12944Part7(execution: ISO12944Part7Execution): {
  acceptable: boolean;
  issues: string[];
  warnings: string[];
} {
  const issues: string[] = [];
  const warnings: string[] = [];

  if (execution.ambientConditions.temperatureC < 5) {
    issues.push("Temperature below 5°C - coating application not recommended");
  } else if (execution.ambientConditions.temperatureC < 10) {
    warnings.push("Low temperature may extend cure time significantly");
  }

  if (execution.ambientConditions.relativeHumidityPercent > 85) {
    issues.push("Relative humidity >85% - risk of moisture contamination");
  }

  const steelTempAboveDewPoint =
    execution.ambientConditions.steelTempC - execution.ambientConditions.dewPointC;
  if (steelTempAboveDewPoint < 3) {
    issues.push(
      `Steel temperature only ${steelTempAboveDewPoint.toFixed(1)}°C above dew point - minimum 3°C required`,
    );
  }

  if (!execution.coatThicknessControl) {
    warnings.push("DFT measurements should be taken per ISO 19840");
  }

  if (!execution.cureTimeRespected) {
    issues.push("Overcoating before minimum cure time causes intercoat adhesion failure");
  }

  return {
    acceptable: issues.length === 0,
    issues,
    warnings,
  };
}

export function validateISO12944Part8(
  newWork: ISO12944Part8NewWork,
  durability: ISO12944Durability,
): { adequate: boolean; recommendations: string[] } {
  const recommendations: string[] = [];

  const warrantyByDurability: Record<ISO12944Durability, number> = {
    L: 2,
    M: 5,
    H: 15,
    VH: 25,
  };

  const expectedWarranty = warrantyByDurability[durability];
  if (newWork.warrantyYears < expectedWarranty) {
    recommendations.push(
      `Warranty ${newWork.warrantyYears} years is below expected ${expectedWarranty} years for ${durability} durability`,
    );
  }

  if (newWork.inspectionLevel === "basic" && ["H", "VH"].includes(durability)) {
    recommendations.push(
      "Comprehensive inspection recommended for high/very high durability systems",
    );
  }

  return {
    adequate: recommendations.length === 0,
    recommendations,
  };
}

export function validateISO12944Part9(maintenance: ISO12944Part9Maintenance): {
  actionRequired: string;
  repairScope: string;
  compatibilityNotes: string[];
} {
  const compatibilityNotes: string[] = [];

  const rustGradeDescriptions: Record<string, { description: string; action: string }> = {
    Ri0: { description: "No rust, no defects", action: "None required - continue monitoring" },
    Ri1: { description: "0.05% rusting", action: "Spot repair recommended within 6 months" },
    Ri2: { description: "0.5% rusting", action: "Spot repair required within 3 months" },
    Ri3: { description: "1% rusting", action: "Immediate spot repair or overcoating required" },
    Ri4: { description: "8% rusting", action: "Full maintenance coating required" },
    Ri5: { description: "40%+ rusting", action: "Complete removal and recoating required" },
  };

  const gradeInfo = rustGradeDescriptions[maintenance.currentCondition];

  if (!maintenance.compatibilityChecked && maintenance.repairStrategy !== "full-removal") {
    compatibilityNotes.push("Compatibility test required before overcoating existing system");
    compatibilityNotes.push("Apply test patch and check adhesion after 7 days");
  }

  if (
    maintenance.repairStrategy === "spot-repair" &&
    ["Ri4", "Ri5"].includes(maintenance.currentCondition)
  ) {
    compatibilityNotes.push(
      "Spot repair insufficient for current rust grade - consider full overcoat or removal",
    );
  }

  const repairScopeByStrategy: Record<string, string> = {
    "spot-repair": "Repair damaged areas only, feather edges 50mm minimum",
    overcoat: "Full surface preparation and overcoating of entire structure",
    "full-removal": "Complete removal to bare steel, full system reapplication",
  };

  return {
    actionRequired: gradeInfo.action,
    repairScope: repairScopeByStrategy[maintenance.repairStrategy],
    compatibilityNotes,
  };
}

export interface ISO8501ValidationResult {
  isValid: boolean;
  grade: string;
  description: string;
  sspcEquivalent: string;
  naceEquivalent: string;
  suitableFor: CorrosivityCategory[];
  surfaceProfile: { minUm: number; maxUm: number };
  issues: string[];
}

const ISO8501_GRADES: Record<
  string,
  {
    description: string;
    sspc: string;
    nace: string;
    suitableCategories: CorrosivityCategory[];
    profile: { minUm: number; maxUm: number };
  }
> = {
  "Sa 3": {
    description: "Blast-cleaning to visually clean steel (white metal)",
    sspc: "SP 5",
    nace: "NACE No. 1",
    suitableCategories: ["C1", "C2", "C3", "C4", "C5", "CX"],
    profile: { minUm: 40, maxUm: 100 },
  },
  "Sa 2.5": {
    description: "Very thorough blast-cleaning (near-white metal)",
    sspc: "SP 10",
    nace: "NACE No. 2",
    suitableCategories: ["C1", "C2", "C3", "C4", "C5", "CX"],
    profile: { minUm: 40, maxUm: 85 },
  },
  "Sa 2": {
    description: "Thorough blast-cleaning (commercial blast)",
    sspc: "SP 6",
    nace: "NACE No. 3",
    suitableCategories: ["C1", "C2", "C3", "C4"],
    profile: { minUm: 25, maxUm: 60 },
  },
  "Sa 1": {
    description: "Light blast-cleaning (brush-off blast)",
    sspc: "SP 7",
    nace: "NACE No. 4",
    suitableCategories: ["C1", "C2"],
    profile: { minUm: 15, maxUm: 40 },
  },
  "St 3": {
    description: "Very thorough hand and power tool cleaning",
    sspc: "SP 3",
    nace: "N/A",
    suitableCategories: ["C1", "C2", "C3"],
    profile: { minUm: 0, maxUm: 25 },
  },
  "St 2": {
    description: "Thorough hand and power tool cleaning",
    sspc: "SP 2",
    nace: "N/A",
    suitableCategories: ["C1", "C2"],
    profile: { minUm: 0, maxUm: 25 },
  },
  "Pt 3": {
    description: "Very thorough flame cleaning",
    sspc: "SP 4",
    nace: "N/A",
    suitableCategories: ["C1", "C2", "C3"],
    profile: { minUm: 0, maxUm: 25 },
  },
  Ma: {
    description: "Pickling (chemical cleaning)",
    sspc: "SP 8",
    nace: "N/A",
    suitableCategories: ["C1", "C2", "C3", "C4"],
    profile: { minUm: 25, maxUm: 50 },
  },
  Be: {
    description: "Sweep blast-cleaning (brush-off of galvanizing)",
    sspc: "SP 16",
    nace: "N/A",
    suitableCategories: ["C1", "C2", "C3", "C4", "C5"],
    profile: { minUm: 25, maxUm: 50 },
  },
};

export function validateISO8501Grade(
  grade: string,
  targetCorrosivity: CorrosivityCategory,
  coatingType?: GenericType,
): ISO8501ValidationResult {
  const issues: string[] = [];
  const gradeData = ISO8501_GRADES[grade];

  if (!gradeData) {
    return {
      isValid: false,
      grade,
      description: "Unknown grade",
      sspcEquivalent: "N/A",
      naceEquivalent: "N/A",
      suitableFor: [],
      surfaceProfile: { minUm: 0, maxUm: 0 },
      issues: [`Grade '${grade}' is not a valid ISO 8501-1 grade`],
    };
  }

  if (!gradeData.suitableCategories.includes(targetCorrosivity)) {
    issues.push(`Grade ${grade} is insufficient for ${targetCorrosivity} corrosivity category`);
    issues.push(
      `Minimum recommended: ${targetCorrosivity === "CX" ? "Sa 3" : targetCorrosivity === "C5" ? "Sa 2.5" : "Sa 2"}`,
    );
  }

  const zincCoatings: GenericType[] = ["zinc-silicate", "zinc-rich-epoxy"];
  if (coatingType && zincCoatings.includes(coatingType) && grade !== "Sa 2.5" && grade !== "Sa 3") {
    issues.push("Zinc-rich coatings require Sa 2.5 or Sa 3 surface preparation");
  }

  return {
    isValid: issues.length === 0,
    grade,
    description: gradeData.description,
    sspcEquivalent: gradeData.sspc,
    naceEquivalent: gradeData.nace,
    suitableFor: gradeData.suitableCategories,
    surfaceProfile: gradeData.profile,
    issues,
  };
}

export function recommendISO8501Grade(
  corrosivity: CorrosivityCategory,
  coatingType: GenericType,
): { recommended: string; alternatives: string[]; rationale: string } {
  const zincCoatings: GenericType[] = ["zinc-silicate", "zinc-rich-epoxy"];

  if (zincCoatings.includes(coatingType)) {
    return {
      recommended: "Sa 2.5",
      alternatives: ["Sa 3"],
      rationale:
        "Zinc-rich primers require near-white or white metal surface for proper adhesion and galvanic protection",
    };
  }

  const gradeByCorrosivity: Record<CorrosivityCategory, { main: string; alt: string[] }> = {
    C1: { main: "St 2", alt: ["St 3", "Sa 1"] },
    C2: { main: "St 3", alt: ["Sa 1", "Sa 2"] },
    C3: { main: "Sa 2", alt: ["Sa 2.5"] },
    C4: { main: "Sa 2.5", alt: ["Sa 3"] },
    C5: { main: "Sa 2.5", alt: ["Sa 3"] },
    CX: { main: "Sa 3", alt: ["Sa 2.5"] },
  };

  const rec = gradeByCorrosivity[corrosivity];

  return {
    recommended: rec.main,
    alternatives: rec.alt,
    rationale: `${corrosivity} category requires minimum ${rec.main} per ISO 8501-1 / ISO 12944-4`,
  };
}

export interface ASNZS2312Result {
  systemCode: string;
  description: string;
  components: { coat: string; genericType: string; dftUm: number }[];
  totalDftUm: number;
  durabilityCategory: "low" | "medium" | "high" | "very-high";
  suitableEnvironments: string[];
}

const ASNZS2312_SYSTEMS: ASNZS2312Result[] = [
  {
    systemCode: "ZE/EP/PU",
    description: "Zinc epoxy primer with epoxy intermediate and polyurethane topcoat",
    components: [
      { coat: "Primer", genericType: "zinc-rich-epoxy", dftUm: 75 },
      { coat: "Intermediate", genericType: "epoxy", dftUm: 125 },
      { coat: "Topcoat", genericType: "polyurethane", dftUm: 50 },
    ],
    totalDftUm: 250,
    durabilityCategory: "high",
    suitableEnvironments: ["Industrial", "Marine", "Coastal"],
  },
  {
    systemCode: "ZS/EP/PU",
    description: "Inorganic zinc silicate with epoxy sealer and polyurethane topcoat",
    components: [
      { coat: "Primer", genericType: "zinc-silicate", dftUm: 75 },
      { coat: "Intermediate", genericType: "epoxy", dftUm: 150 },
      { coat: "Topcoat", genericType: "polyurethane", dftUm: 50 },
    ],
    totalDftUm: 275,
    durabilityCategory: "very-high",
    suitableEnvironments: ["Marine", "Offshore", "Severe industrial"],
  },
  {
    systemCode: "EP/EP/PU",
    description: "Epoxy primer with epoxy intermediate and polyurethane topcoat",
    components: [
      { coat: "Primer", genericType: "epoxy", dftUm: 75 },
      { coat: "Intermediate", genericType: "epoxy", dftUm: 125 },
      { coat: "Topcoat", genericType: "polyurethane", dftUm: 50 },
    ],
    totalDftUm: 250,
    durabilityCategory: "high",
    suitableEnvironments: ["Industrial", "Urban", "Rural"],
  },
  {
    systemCode: "EP/PU",
    description: "Epoxy primer with polyurethane topcoat",
    components: [
      { coat: "Primer", genericType: "epoxy", dftUm: 100 },
      { coat: "Topcoat", genericType: "polyurethane", dftUm: 50 },
    ],
    totalDftUm: 150,
    durabilityCategory: "medium",
    suitableEnvironments: ["Urban", "Rural", "Light industrial"],
  },
  {
    systemCode: "HDG/EP/PU",
    description: "Hot-dip galvanizing with epoxy primer and polyurethane topcoat (duplex)",
    components: [
      { coat: "Galvanizing", genericType: "galvanizing", dftUm: 85 },
      { coat: "Primer", genericType: "epoxy", dftUm: 40 },
      { coat: "Topcoat", genericType: "polyurethane", dftUm: 40 },
    ],
    totalDftUm: 165,
    durabilityCategory: "very-high",
    suitableEnvironments: ["Marine", "Coastal", "Industrial", "Rural"],
  },
  {
    systemCode: "GF",
    description: "Glass flake epoxy for immersion/splash zone",
    components: [{ coat: "Single coat", genericType: "epoxy-glass-flake", dftUm: 500 }],
    totalDftUm: 500,
    durabilityCategory: "very-high",
    suitableEnvironments: ["Immersion", "Splash zone", "Chemical"],
  },
];

export function recommendASNZS2312System(
  environment: string,
  durabilityRequired: "low" | "medium" | "high" | "very-high",
): ASNZS2312Result[] {
  return ASNZS2312_SYSTEMS.filter(
    (sys) =>
      sys.suitableEnvironments.some((env) =>
        env.toLowerCase().includes(environment.toLowerCase()),
      ) && durabilityOrder(sys.durabilityCategory) >= durabilityOrder(durabilityRequired),
  );
}

function durabilityOrder(d: "low" | "medium" | "high" | "very-high"): number {
  const order = { low: 1, medium: 2, high: 3, "very-high": 4 };
  return order[d];
}

export function allASNZS2312Systems(): ASNZS2312Result[] {
  return ASNZS2312_SYSTEMS;
}

export interface ASNZS4680Result {
  gradeCode: string;
  minimumCoatingMassGPerM2: number;
  minimumThicknessUm: number;
  application: string;
  suitableCorrosivity: CorrosivityCategory[];
  lifeExpectancyYears: { rural: number; industrial: number; marine: number };
}

const ASNZS4680_GRADES: ASNZS4680Result[] = [
  {
    gradeCode: "Z100",
    minimumCoatingMassGPerM2: 100,
    minimumThicknessUm: 7,
    application: "Light duty indoor",
    suitableCorrosivity: ["C1"],
    lifeExpectancyYears: { rural: 15, industrial: 8, marine: 5 },
  },
  {
    gradeCode: "Z200",
    minimumCoatingMassGPerM2: 200,
    minimumThicknessUm: 14,
    application: "Indoor dry environments",
    suitableCorrosivity: ["C1", "C2"],
    lifeExpectancyYears: { rural: 25, industrial: 15, marine: 10 },
  },
  {
    gradeCode: "Z275",
    minimumCoatingMassGPerM2: 275,
    minimumThicknessUm: 19,
    application: "Standard outdoor exposure",
    suitableCorrosivity: ["C1", "C2", "C3"],
    lifeExpectancyYears: { rural: 35, industrial: 20, marine: 15 },
  },
  {
    gradeCode: "Z350",
    minimumCoatingMassGPerM2: 350,
    minimumThicknessUm: 25,
    application: "Moderate corrosive environments",
    suitableCorrosivity: ["C1", "C2", "C3", "C4"],
    lifeExpectancyYears: { rural: 45, industrial: 28, marine: 18 },
  },
  {
    gradeCode: "Z450",
    minimumCoatingMassGPerM2: 450,
    minimumThicknessUm: 32,
    application: "Severe industrial/coastal exposure",
    suitableCorrosivity: ["C1", "C2", "C3", "C4", "C5"],
    lifeExpectancyYears: { rural: 60, industrial: 35, marine: 22 },
  },
  {
    gradeCode: "Z600",
    minimumCoatingMassGPerM2: 600,
    minimumThicknessUm: 42,
    application: "Extreme exposure, long life required",
    suitableCorrosivity: ["C1", "C2", "C3", "C4", "C5", "CX"],
    lifeExpectancyYears: { rural: 80, industrial: 45, marine: 30 },
  },
];

export function recommendASNZS4680Grade(
  corrosivity: CorrosivityCategory,
  targetLifeYears: number,
  environment: "rural" | "industrial" | "marine",
): ASNZS4680Result | null {
  return (
    ASNZS4680_GRADES.find(
      (grade) =>
        grade.suitableCorrosivity.includes(corrosivity) &&
        grade.lifeExpectancyYears[environment] >= targetLifeYears,
    ) || null
  );
}

export function allASNZS4680Grades(): ASNZS4680Result[] {
  return ASNZS4680_GRADES;
}

export function validateGalvanizingThickness(
  measuredThicknessUm: number,
  gradeCode: string,
): { compliant: boolean; grade: ASNZS4680Result | null; issues: string[] } {
  const issues: string[] = [];
  const grade = ASNZS4680_GRADES.find((g) => g.gradeCode === gradeCode);

  if (!grade) {
    return { compliant: false, grade: null, issues: [`Unknown grade code: ${gradeCode}`] };
  }

  if (measuredThicknessUm < grade.minimumThicknessUm) {
    issues.push(
      `Measured thickness ${measuredThicknessUm}μm is below minimum ${grade.minimumThicknessUm}μm for ${gradeCode}`,
    );
  }

  return { compliant: issues.length === 0, grade, issues };
}

export interface ASTMStandard {
  designation: string;
  title: string;
  category: "surface-prep" | "coating" | "testing" | "galvanizing" | "abrasives";
  relatedISO?: string;
  description: string;
}

const ASTM_STANDARDS: ASTMStandard[] = [
  {
    designation: "ASTM D4417",
    title: "Standard Test Methods for Field Measurement of Surface Profile of Blast Cleaned Steel",
    category: "surface-prep",
    relatedISO: "ISO 8503",
    description: "Replica tape, stylus, and comparator methods for profile measurement",
  },
  {
    designation: "ASTM D4285",
    title: "Standard Test Method for Indicating Oil or Water in Compressed Air",
    category: "surface-prep",
    description: "White blotter test for compressed air cleanliness",
  },
  {
    designation: "ASTM D3359",
    title: "Standard Test Methods for Rating Adhesion by Tape Test",
    category: "testing",
    relatedISO: "ISO 2409",
    description: "Cross-cut tape test for coating adhesion (Method B)",
  },
  {
    designation: "ASTM D4541",
    title: "Standard Test Method for Pull-Off Strength of Coatings Using Portable Adhesion Testers",
    category: "testing",
    relatedISO: "ISO 4624",
    description: "Dolly pull-off test for adhesion strength in MPa/psi",
  },
  {
    designation: "ASTM D4138",
    title:
      "Standard Practices for Measurement of Dry Film Thickness of Protective Coating Systems by Destructive, Cross-Sectioning Means",
    category: "testing",
    relatedISO: "ISO 2808",
    description: "Microscopic cross-section measurement of DFT",
  },
  {
    designation: "ASTM D7091",
    title:
      "Standard Practice for Nondestructive Measurement of Dry Film Thickness of Nonmagnetic Coatings Applied to Ferrous Metals",
    category: "testing",
    relatedISO: "ISO 2808",
    description: "Eddy current and magnetic DFT gauges",
  },
  {
    designation: "ASTM B117",
    title: "Standard Practice for Operating Salt Spray (Fog) Apparatus",
    category: "testing",
    relatedISO: "ISO 9227",
    description: "Neutral salt spray testing for corrosion resistance",
  },
  {
    designation: "ASTM D4060",
    title: "Standard Test Method for Abrasion Resistance of Organic Coatings by the Taber Abraser",
    category: "testing",
    description: "Wear resistance testing using Taber abraser",
  },
  {
    designation: "ASTM D522",
    title: "Standard Test Methods for Mandrel Bend Test of Attached Organic Coatings",
    category: "testing",
    relatedISO: "ISO 1519",
    description: "Flexibility testing using cylindrical mandrel",
  },
  {
    designation: "ASTM D2794",
    title:
      "Standard Test Method for Resistance of Organic Coatings to the Effects of Rapid Deformation (Impact)",
    category: "testing",
    description: "Direct and reverse impact testing",
  },
  {
    designation: "ASTM A123",
    title:
      "Standard Specification for Zinc (Hot-Dip Galvanized) Coatings on Iron and Steel Products",
    category: "galvanizing",
    relatedISO: "ISO 1461",
    description: "Hot-dip galvanizing requirements for structural steel",
  },
  {
    designation: "ASTM A153",
    title: "Standard Specification for Zinc Coating (Hot-Dip) on Iron and Steel Hardware",
    category: "galvanizing",
    description: "Galvanizing requirements for hardware/fasteners",
  },
  {
    designation: "ASTM D4940",
    title:
      "Standard Test Method for Conductimetric Analysis of Water Soluble Ionic Contamination of Blasting Abrasives",
    category: "abrasives",
    description: "Conductivity testing of abrasives for salt contamination",
  },
];

export function allASTMStandards(): ASTMStandard[] {
  return ASTM_STANDARDS;
}

export function astmStandardsByCategory(category: ASTMStandard["category"]): ASTMStandard[] {
  return ASTM_STANDARDS.filter((s) => s.category === category);
}

export function findRelatedASTM(isoStandard: string): ASTMStandard[] {
  return ASTM_STANDARDS.filter((s) => s.relatedISO === isoStandard);
}

export function astmEquivalentForTest(testType: string): ASTMStandard | null {
  const testMappings: Record<string, string> = {
    adhesion: "ASTM D4541",
    "cross-cut": "ASTM D3359",
    dft: "ASTM D7091",
    profile: "ASTM D4417",
    "salt-spray": "ASTM B117",
    impact: "ASTM D2794",
    flexibility: "ASTM D522",
    abrasion: "ASTM D4060",
  };

  const designation = testMappings[testType.toLowerCase()];
  return ASTM_STANDARDS.find((s) => s.designation === designation) || null;
}

export interface CathodicProtectionCompatibility {
  coatingType: GenericType;
  compatible: boolean;
  disbondmentRisk: "low" | "medium" | "high";
  recommendations: string[];
  testStandards: string[];
}

const CP_COMPATIBILITY: Record<
  GenericType,
  Omit<CathodicProtectionCompatibility, "coatingType">
> = {
  "zinc-silicate": {
    compatible: true,
    disbondmentRisk: "low",
    recommendations: ["Excellent CP compatibility - zinc provides sacrificial protection"],
    testStandards: ["ASTM G8", "ASTM G42", "ISO 15711"],
  },
  "zinc-rich-epoxy": {
    compatible: true,
    disbondmentRisk: "low",
    recommendations: ["Good CP compatibility - organic zinc provides some galvanic protection"],
    testStandards: ["ASTM G8", "ASTM G42"],
  },
  epoxy: {
    compatible: true,
    disbondmentRisk: "medium",
    recommendations: [
      "Ensure coating is free of holidays before burial/immersion",
      "Use high-build epoxy (>300μm) for CP applications",
    ],
    testStandards: ["ASTM G8", "ASTM G95", "ISO 15711"],
  },
  "epoxy-glass-flake": {
    compatible: true,
    disbondmentRisk: "low",
    recommendations: [
      "Excellent resistance to cathodic disbondment",
      "Preferred for buried pipelines",
    ],
    testStandards: ["ASTM G8", "ASTM G95", "ISO 15711", "NACE TM0115"],
  },
  "epoxy-phenolic": {
    compatible: true,
    disbondmentRisk: "medium",
    recommendations: ["Good for combined chemical and CP service"],
    testStandards: ["ASTM G8"],
  },
  "coal-tar-epoxy": {
    compatible: true,
    disbondmentRisk: "low",
    recommendations: ["Traditional choice for buried/submerged steel with CP"],
    testStandards: ["ASTM G8", "ASTM G95"],
  },
  fbe: {
    compatible: true,
    disbondmentRisk: "low",
    recommendations: [
      "Industry standard for buried pipelines with CP",
      "Apply at 200-300μm DFT for optimal performance",
    ],
    testStandards: ["ASTM G8", "ASTM G95", "CSA Z245.20", "ISO 21809-2"],
  },
  "3lpe": {
    compatible: true,
    disbondmentRisk: "low",
    recommendations: [
      "Excellent for buried pipelines with CP",
      "FBE underlayer provides adhesion, PE provides barrier",
    ],
    testStandards: ["ISO 21809-1", "DIN 30670"],
  },
  polyurethane: {
    compatible: false,
    disbondmentRisk: "high",
    recommendations: [
      "Not recommended for CP service",
      "Susceptible to alkali attack from CP current",
    ],
    testStandards: ["ASTM G8"],
  },
  polysiloxane: {
    compatible: false,
    disbondmentRisk: "high",
    recommendations: ["Not recommended for buried/submerged CP service"],
    testStandards: [],
  },
  alkyd: {
    compatible: false,
    disbondmentRisk: "high",
    recommendations: ["Not suitable for immersion or burial with CP"],
    testStandards: [],
  },
  acrylic: {
    compatible: false,
    disbondmentRisk: "high",
    recommendations: ["Not suitable for immersion or burial with CP"],
    testStandards: [],
  },
  vinyl: {
    compatible: true,
    disbondmentRisk: "medium",
    recommendations: ["Moderate CP compatibility for immersion service"],
    testStandards: ["ASTM G8"],
  },
  polyurea: {
    compatible: true,
    disbondmentRisk: "medium",
    recommendations: ["Good CP compatibility but test specific formulation"],
    testStandards: ["ASTM G8", "ASTM G95"],
  },
  "high-temp-silicone": {
    compatible: false,
    disbondmentRisk: "high",
    recommendations: ["Not applicable - high temp service not compatible with CP"],
    testStandards: [],
  },
  intumescent: {
    compatible: false,
    disbondmentRisk: "high",
    recommendations: ["Fire protection only - not for corrosion/CP service"],
    testStandards: [],
  },
  "epoxy-mio": {
    compatible: true,
    disbondmentRisk: "medium",
    recommendations: ["MIO flakes may improve disbondment resistance"],
    testStandards: ["ASTM G8"],
  },
  "epoxy-mastic": {
    compatible: true,
    disbondmentRisk: "medium",
    recommendations: ["Surface tolerant but ensure adequate DFT for CP"],
    testStandards: ["ASTM G8"],
  },
};

export function checkCathodicProtectionCompatibility(
  coatingType: GenericType,
): CathodicProtectionCompatibility {
  const compat = CP_COMPATIBILITY[coatingType];
  return { coatingType, ...compat };
}

export function recommendCPCompatibleCoatings(
  application: "buried-pipe" | "submerged" | "splash-zone" | "tank-bottom",
): CathodicProtectionCompatibility[] {
  const applicationPreferences: Record<string, GenericType[]> = {
    "buried-pipe": ["fbe", "3lpe", "epoxy-glass-flake", "coal-tar-epoxy"],
    submerged: ["epoxy-glass-flake", "epoxy", "coal-tar-epoxy", "vinyl"],
    "splash-zone": ["epoxy-glass-flake", "zinc-silicate", "zinc-rich-epoxy"],
    "tank-bottom": ["epoxy-glass-flake", "epoxy", "zinc-rich-epoxy"],
  };

  const preferred = applicationPreferences[application] || [];
  return preferred.map((type) => checkCathodicProtectionCompatibility(type));
}

export interface FireProtectionRequirement {
  fireRating: "30" | "60" | "90" | "120" | "180" | "240";
  structureType: "column" | "beam" | "connection" | "hollow-section";
  steelSectionFactor: number;
  requiredDftMm: number;
  productType: "intumescent" | "cementitious" | "board";
  testStandard: string;
}

const INTUMESCENT_DFT_TABLE: Record<string, Record<string, number>> = {
  column: {
    "30": 0.5,
    "60": 1.2,
    "90": 2.0,
    "120": 3.0,
    "180": 4.5,
    "240": 6.0,
  },
  beam: {
    "30": 0.4,
    "60": 1.0,
    "90": 1.7,
    "120": 2.5,
    "180": 4.0,
    "240": 5.5,
  },
  connection: {
    "30": 0.6,
    "60": 1.4,
    "90": 2.3,
    "120": 3.5,
    "180": 5.0,
    "240": 7.0,
  },
  "hollow-section": {
    "30": 0.7,
    "60": 1.6,
    "90": 2.5,
    "120": 3.8,
    "180": 5.5,
    "240": 7.5,
  },
};

export function calculateFireProtectionDft(
  fireRating: FireProtectionRequirement["fireRating"],
  structureType: FireProtectionRequirement["structureType"],
  sectionFactor: number,
): FireProtectionRequirement {
  const baseDft = INTUMESCENT_DFT_TABLE[structureType][fireRating];

  const adjustmentFactor = sectionFactor > 200 ? 1.0 + (sectionFactor - 200) / 400 : 1.0;
  const requiredDft = baseDft * adjustmentFactor;

  return {
    fireRating,
    structureType,
    steelSectionFactor: sectionFactor,
    requiredDftMm: Math.round(requiredDft * 10) / 10,
    productType: "intumescent",
    testStandard: "BS 476 / EN 13381-8 / ASTM E119",
  };
}

export function validateFireProtectionSystem(
  appliedDftMm: number,
  requirement: FireProtectionRequirement,
): { compliant: boolean; issues: string[]; margin: number } {
  const issues: string[] = [];
  const margin = appliedDftMm - requirement.requiredDftMm;

  if (appliedDftMm < requirement.requiredDftMm) {
    issues.push(
      `Applied DFT ${appliedDftMm}mm is below required ${requirement.requiredDftMm}mm for ${requirement.fireRating} minute rating`,
    );
  }

  if (appliedDftMm > requirement.requiredDftMm * 1.5) {
    issues.push("Excessive thickness may cause adhesion issues - consult manufacturer");
  }

  return { compliant: issues.length === 0, issues, margin };
}

export interface FoodContactCompliance {
  standard: string;
  region: "USA" | "EU" | "AU/NZ";
  approvalBody: string;
  requirements: string[];
  suitableCoatingTypes: GenericType[];
}

const FOOD_CONTACT_STANDARDS: FoodContactCompliance[] = [
  {
    standard: "FDA 21 CFR 175.300",
    region: "USA",
    approvalBody: "FDA",
    requirements: [
      "Resinous and polymeric coatings for food contact",
      "Migration limits for extractables",
      "Temperature limitations specified",
    ],
    suitableCoatingTypes: ["epoxy-phenolic", "epoxy", "polyurethane", "vinyl"],
  },
  {
    standard: "USDA Approval",
    region: "USA",
    approvalBody: "USDA",
    requirements: [
      "For use in USDA-inspected facilities",
      "Must meet FDA requirements plus additional hygiene standards",
    ],
    suitableCoatingTypes: ["epoxy-phenolic", "epoxy"],
  },
  {
    standard: "EU 1935/2004",
    region: "EU",
    approvalBody: "EFSA",
    requirements: [
      "Framework regulation for food contact materials",
      "Good Manufacturing Practice required",
      "Traceability requirements",
    ],
    suitableCoatingTypes: ["epoxy-phenolic", "epoxy", "polyurethane"],
  },
  {
    standard: "EU 10/2011",
    region: "EU",
    approvalBody: "EFSA",
    requirements: [
      "Plastic materials and articles",
      "Overall migration limit 10mg/dm²",
      "Specific migration limits per substance",
    ],
    suitableCoatingTypes: ["epoxy-phenolic", "polyurethane"],
  },
  {
    standard: "AS 4020",
    region: "AU/NZ",
    approvalBody: "WaterMark",
    requirements: [
      "Products for use in contact with drinking water",
      "Cytotoxicity, mutagenicity testing",
      "Metal extraction limits",
    ],
    suitableCoatingTypes: ["epoxy", "epoxy-phenolic"],
  },
];

export function foodContactComplianceForRegion(
  region: "USA" | "EU" | "AU/NZ",
): FoodContactCompliance[] {
  return FOOD_CONTACT_STANDARDS.filter((s) => s.region === region);
}

export function checkFoodContactSuitability(coatingType: GenericType): {
  suitable: boolean;
  standards: FoodContactCompliance[];
} {
  const applicableStandards = FOOD_CONTACT_STANDARDS.filter((s) =>
    s.suitableCoatingTypes.includes(coatingType),
  );
  return { suitable: applicableStandards.length > 0, standards: applicableStandards };
}

export interface PotableWaterCompliance {
  standard: string;
  region: string;
  approvalBody: string;
  testRequirements: string[];
  maxExposureTemp: number;
  certificationMark?: string;
}

const POTABLE_WATER_STANDARDS: PotableWaterCompliance[] = [
  {
    standard: "NSF/ANSI 61",
    region: "USA/Canada",
    approvalBody: "NSF International",
    testRequirements: [
      "Extraction testing at exposure temperature",
      "Toxicological evaluation of extractables",
      "Annual audit of manufacturing facility",
    ],
    maxExposureTemp: 82,
    certificationMark: "NSF Mark",
  },
  {
    standard: "NSF/ANSI 600",
    region: "USA",
    approvalBody: "NSF International",
    testRequirements: [
      "Health effects testing for pipes and fittings",
      "Lead content requirements",
    ],
    maxExposureTemp: 82,
    certificationMark: "NSF Mark",
  },
  {
    standard: "WRAS (BS 6920)",
    region: "UK",
    approvalBody: "Water Regulations Advisory Scheme",
    testRequirements: [
      "Organoleptic testing (taste/odour)",
      "Cytotoxicity testing",
      "Growth of aquatic microorganisms",
      "Extraction of metals/substances",
    ],
    maxExposureTemp: 85,
    certificationMark: "WRAS Approved",
  },
  {
    standard: "AS/NZS 4020",
    region: "Australia/New Zealand",
    approvalBody: "WaterMark",
    testRequirements: ["Cytotoxicity testing", "Mutagenicity testing", "Metal extraction testing"],
    maxExposureTemp: 80,
    certificationMark: "WaterMark",
  },
  {
    standard: "ACS",
    region: "France",
    approvalBody: "Attestation de Conformité Sanitaire",
    testRequirements: ["Migration testing", "Organoleptic assessment"],
    maxExposureTemp: 60,
    certificationMark: "ACS",
  },
  {
    standard: "KTW",
    region: "Germany",
    approvalBody: "DVGW",
    testRequirements: ["Migration testing per DIN EN 12873-1", "Microbiological growth testing"],
    maxExposureTemp: 85,
    certificationMark: "DVGW",
  },
];

export function potableWaterStandardsForRegion(region: string): PotableWaterCompliance[] {
  return POTABLE_WATER_STANDARDS.filter((s) =>
    s.region.toLowerCase().includes(region.toLowerCase()),
  );
}

export function allPotableWaterStandards(): PotableWaterCompliance[] {
  return POTABLE_WATER_STANDARDS;
}

export function validatePotableWaterCompliance(
  certifications: string[],
  operatingTempC: number,
): { compliant: boolean; issues: string[]; coveredStandards: PotableWaterCompliance[] } {
  const issues: string[] = [];
  const coveredStandards: PotableWaterCompliance[] = [];

  POTABLE_WATER_STANDARDS.forEach((standard) => {
    const hasCert = certifications.some(
      (c) =>
        c.toLowerCase().includes(standard.standard.toLowerCase()) ||
        (standard.certificationMark &&
          c.toLowerCase().includes(standard.certificationMark.toLowerCase())),
    );

    if (hasCert) {
      coveredStandards.push(standard);
      if (operatingTempC > standard.maxExposureTemp) {
        issues.push(
          `Operating temperature ${operatingTempC}°C exceeds ${standard.standard} maximum of ${standard.maxExposureTemp}°C`,
        );
      }
    }
  });

  if (coveredStandards.length === 0) {
    issues.push("No recognized potable water certifications found");
  }

  return { compliant: issues.length === 0, issues, coveredStandards };
}

export interface VOCLimit {
  region: string;
  regulation: string;
  categoryOrProduct: string;
  limitGPerL: number;
  effectiveDate?: string;
  notes?: string;
}

const VOC_LIMITS: VOCLimit[] = [
  {
    region: "USA (Federal)",
    regulation: "EPA AIM VOC Rule",
    categoryOrProduct: "Industrial maintenance coatings",
    limitGPerL: 340,
    notes: "40 CFR 59 Subpart D",
  },
  {
    region: "California (SCAQMD)",
    regulation: "Rule 1113",
    categoryOrProduct: "Industrial maintenance coatings",
    limitGPerL: 250,
    effectiveDate: "2019-01-01",
  },
  {
    region: "California (SCAQMD)",
    regulation: "Rule 1113",
    categoryOrProduct: "Zinc-rich primers",
    limitGPerL: 340,
  },
  {
    region: "California (SCAQMD)",
    regulation: "Rule 1113",
    categoryOrProduct: "High-temperature coatings",
    limitGPerL: 420,
  },
  {
    region: "EU",
    regulation: "Directive 2004/42/EC (Decopaint)",
    categoryOrProduct: "Special finishes",
    limitGPerL: 500,
  },
  {
    region: "EU",
    regulation: "Directive 2004/42/EC (Decopaint)",
    categoryOrProduct: "Two-pack performance coatings",
    limitGPerL: 500,
  },
  {
    region: "EU",
    regulation: "IED 2010/75/EU",
    categoryOrProduct: "Industrial protective coatings (general)",
    limitGPerL: 420,
    notes: "Solvent emissions from industrial activities",
  },
  {
    region: "UK",
    regulation:
      "The Volatile Organic Compounds in Paints, Varnishes and Vehicle Refinishing Products Regulations 2012",
    categoryOrProduct: "Protective coatings",
    limitGPerL: 500,
  },
  {
    region: "Australia",
    regulation: "NPI (National Pollutant Inventory)",
    categoryOrProduct: "Industrial coatings",
    limitGPerL: 420,
    notes: "Reporting threshold, not hard limit",
  },
  {
    region: "South Africa",
    regulation: "NEMAQA Section 21",
    categoryOrProduct: "Industrial coatings",
    limitGPerL: 500,
    notes: "Listed activities require AEL",
  },
  {
    region: "China",
    regulation: "GB 30981-2020",
    categoryOrProduct: "Industrial protective coatings",
    limitGPerL: 420,
  },
];

export function vocLimitsForRegion(region: string): VOCLimit[] {
  return VOC_LIMITS.filter((v) => v.region.toLowerCase().includes(region.toLowerCase()));
}

export function allVOCLimits(): VOCLimit[] {
  return VOC_LIMITS;
}

export function checkVOCCompliance(
  productVocGPerL: number,
  region: string,
  productCategory: string,
): { compliant: boolean; applicableLimits: VOCLimit[]; exceedances: VOCLimit[] } {
  const applicableLimits = VOC_LIMITS.filter(
    (v) =>
      v.region.toLowerCase().includes(region.toLowerCase()) &&
      v.categoryOrProduct.toLowerCase().includes(productCategory.toLowerCase()),
  );

  if (applicableLimits.length === 0) {
    const regionalLimits = VOC_LIMITS.filter((v) =>
      v.region.toLowerCase().includes(region.toLowerCase()),
    );
    return { compliant: true, applicableLimits: regionalLimits, exceedances: [] };
  }

  const exceedances = applicableLimits.filter((v) => productVocGPerL > v.limitGPerL);

  return {
    compliant: exceedances.length === 0,
    applicableLimits,
    exceedances,
  };
}

export function recommendLowVOCAlternatives(
  currentGenericType: GenericType,
  targetVocGPerL: number,
): { alternatives: GenericType[]; notes: string[] } {
  const notes: string[] = [];
  const alternatives: GenericType[] = [];

  const lowVocOptions: { type: GenericType; typicalVoc: number }[] = [
    { type: "polysiloxane", typicalVoc: 100 },
    { type: "polyurea", typicalVoc: 0 },
    { type: "epoxy", typicalVoc: 200 },
    { type: "polyurethane", typicalVoc: 250 },
    { type: "zinc-rich-epoxy", typicalVoc: 250 },
    { type: "epoxy-glass-flake", typicalVoc: 200 },
  ];

  lowVocOptions.forEach((opt) => {
    if (opt.typicalVoc <= targetVocGPerL && opt.type !== currentGenericType) {
      alternatives.push(opt.type);
    }
  });

  notes.push(`Target VOC: ≤${targetVocGPerL} g/L`);
  notes.push("Consider waterborne versions for further VOC reduction");
  notes.push("High-solids formulations typically have lower VOC than standard products");

  return { alternatives, notes };
}
