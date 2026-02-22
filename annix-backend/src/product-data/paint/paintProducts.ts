export type PaintSupplier =
  | "Jotun"
  | "Sigma"
  | "StonCor"
  | "Hempel"
  | "PPG"
  | "Carboline"
  | "International"
  | "Sherwin-Williams"
  | "Generic";

export type GenericType =
  | "zinc-rich-epoxy"
  | "zinc-silicate"
  | "epoxy"
  | "epoxy-mio"
  | "epoxy-mastic"
  | "epoxy-phenolic"
  | "epoxy-glass-flake"
  | "coal-tar-epoxy"
  | "polyurethane"
  | "polysiloxane"
  | "polyurea"
  | "acrylic"
  | "alkyd"
  | "vinyl"
  | "high-temp-silicone"
  | "intumescent"
  | "fbe"
  | "3lpe";

export type ProductRole = "primer" | "intermediate" | "topcoat" | "multi-purpose";

export type CorrosivityCategory = "C1" | "C2" | "C3" | "C4" | "C5" | "CX";

export interface OvercoatInterval {
  tempC: number;
  minHours: number;
  maxHours: number | null;
}

export interface CuringTime {
  tempC: number;
  touchDryHours: number;
  overcoatMinHours: number;
  fullCureDays: number;
}

export interface PaintProduct {
  id: string;
  name: string;
  supplier: PaintSupplier;
  genericType: GenericType;
  productRole: ProductRole;
  description: string;
  volumeSolidsPercent: number;
  dft: {
    minUm: number;
    maxUm: number;
    typicalUm: number;
  };
  spreadingRateM2PerL: number | null;
  vocGPerL: number | null;
  flashPointC: number | null;
  potLifeHours: number | null;
  shelfLifeMonths: number | null;
  heatResistance: {
    continuousC: number;
    peakC: number;
    immersionC: number | null;
  };
  applicationTemp: {
    minSubstrateC: number;
    maxSubstrateC: number;
    minAirC: number;
    maxAirC: number;
  };
  curingAt23C: {
    touchDryHours: number;
    overcoatMinHours: number;
    fullCureDays: number;
  };
  surfaceTolerant: boolean;
  surfacePrep: {
    minimum: string;
    recommended: string;
  };
  approvals: string[];
  corrosivityCategories: CorrosivityCategory[];
  compatiblePreviousCoats: GenericType[];
  compatibleSubsequentCoats: GenericType[];
  tdsDate: string;
  features: string[];
}

export const paintProducts: PaintProduct[] = [
  {
    id: "jotun-barrier",
    name: "Barrier",
    supplier: "Jotun",
    genericType: "zinc-rich-epoxy",
    productRole: "primer",
    description:
      "Two component polyamide cured zinc rich epoxy coating with very high zinc dust content. Conforms to SSPC Paint 20 Level 2.",
    volumeSolidsPercent: 53,
    dft: { minUm: 25, maxUm: 125, typicalUm: 75 },
    spreadingRateM2PerL: null,
    vocGPerL: null,
    flashPointC: null,
    potLifeHours: null,
    shelfLifeMonths: null,
    heatResistance: { continuousC: 120, peakC: 140, immersionC: null },
    applicationTemp: { minSubstrateC: 5, maxSubstrateC: 40, minAirC: 5, maxAirC: 40 },
    curingAt23C: { touchDryHours: 0.17, overcoatMinHours: 1.5, fullCureDays: 5 },
    surfaceTolerant: false,
    surfacePrep: { minimum: "St 3", recommended: "Sa 2½" },
    approvals: ["NORSOK M-501 Rev.5 System 1", "SSPC Paint 20 Level 2", "ASTM D520 Type II"],
    corrosivityCategories: ["C3", "C4", "C5", "CX"],
    compatiblePreviousCoats: ["zinc-silicate"],
    compatibleSubsequentCoats: ["polyurethane", "epoxy", "epoxy-mastic"],
    tdsDate: "2014-08-01",
    features: ["Very high zinc content", "Extended durability systems", "Offshore suitable"],
  },
  {
    id: "jotun-jotamastic-87",
    name: "Jotamastic 87",
    supplier: "Jotun",
    genericType: "epoxy-mastic",
    productRole: "multi-purpose",
    description:
      "Two component polyamine cured epoxy mastic coating. Surface tolerant, high solids, high build. Can be applied at sub-zero surface temperatures.",
    volumeSolidsPercent: 82,
    dft: { minUm: 150, maxUm: 300, typicalUm: 200 },
    spreadingRateM2PerL: null,
    vocGPerL: null,
    flashPointC: null,
    potLifeHours: null,
    shelfLifeMonths: null,
    heatResistance: { continuousC: 120, peakC: 120, immersionC: 50 },
    applicationTemp: { minSubstrateC: -5, maxSubstrateC: 40, minAirC: -5, maxAirC: 40 },
    curingAt23C: { touchDryHours: 2, overcoatMinHours: 4, fullCureDays: 2 },
    surfaceTolerant: true,
    surfacePrep: { minimum: "St 2", recommended: "Sa 2" },
    approvals: ["NORSOK M-501"],
    corrosivityCategories: ["C3", "C4", "C5", "CX"],
    compatiblePreviousCoats: ["zinc-rich-epoxy", "zinc-silicate", "epoxy", "epoxy-mastic"],
    compatibleSubsequentCoats: ["polyurethane", "epoxy", "acrylic", "vinyl"],
    tdsDate: "2014-08-01",
    features: ["Surface tolerant", "High build", "Sub-zero application", "Maintenance/repair"],
  },
  {
    id: "jotun-hardtop-xp",
    name: "Hardtop XP",
    supplier: "Jotun",
    genericType: "polyurethane",
    productRole: "topcoat",
    description:
      "Two component aliphatic acrylic polyurethane coating with gloss finish and excellent gloss retention.",
    volumeSolidsPercent: 63,
    dft: { minUm: 50, maxUm: 100, typicalUm: 60 },
    spreadingRateM2PerL: null,
    vocGPerL: null,
    flashPointC: null,
    potLifeHours: null,
    shelfLifeMonths: null,
    heatResistance: { continuousC: 120, peakC: 140, immersionC: null },
    applicationTemp: { minSubstrateC: 5, maxSubstrateC: 40, minAirC: 5, maxAirC: 40 },
    curingAt23C: { touchDryHours: 3.5, overcoatMinHours: 7, fullCureDays: 7 },
    surfaceTolerant: false,
    surfacePrep: { minimum: "Clean dry coating", recommended: "Clean dry coating" },
    approvals: ["NORSOK M-501 Rev.5 System 1", "IMO/SOLAS low flame spread", "FDA 21 CFR 175.300"],
    corrosivityCategories: ["C3", "C4", "C5", "CX"],
    compatiblePreviousCoats: ["epoxy", "zinc-rich-epoxy", "epoxy-mastic", "polyurethane"],
    compatibleSubsequentCoats: [],
    tdsDate: "2014-08-01",
    features: [
      "UV resistant",
      "High gloss retention",
      "Offshore suitable",
      "Food contact compliant",
    ],
  },
  {
    id: "sigma-sigmacover-350",
    name: "SigmaCover 350",
    supplier: "Sigma",
    genericType: "epoxy",
    productRole: "multi-purpose",
    description:
      "Two component high build polyamine cured epoxy primer/coating. Surface tolerant with excellent corrosion resistance.",
    volumeSolidsPercent: 72,
    dft: { minUm: 50, maxUm: 150, typicalUm: 125 },
    spreadingRateM2PerL: null,
    vocGPerL: null,
    flashPointC: null,
    potLifeHours: null,
    shelfLifeMonths: null,
    heatResistance: { continuousC: 100, peakC: 120, immersionC: null },
    applicationTemp: { minSubstrateC: 5, maxSubstrateC: 40, minAirC: 5, maxAirC: 40 },
    curingAt23C: { touchDryHours: 2, overcoatMinHours: 6, fullCureDays: 7 },
    surfaceTolerant: true,
    surfacePrep: { minimum: "St 2", recommended: "Sa 2½" },
    approvals: [],
    corrosivityCategories: ["C2", "C3", "C4", "C5"],
    compatiblePreviousCoats: ["epoxy", "alkyd"],
    compatibleSubsequentCoats: ["polyurethane", "epoxy", "alkyd", "acrylic"],
    tdsDate: "2010-12-01",
    features: ["Surface tolerant", "High build", "Fast curing", "Good impact resistance"],
  },
  {
    id: "stoncor-carboguard-193-mio",
    name: "Carboguard 193 MIO",
    supplier: "StonCor",
    genericType: "epoxy-mio",
    productRole: "primer",
    description:
      "Zinc phosphate epoxy polyamide primer containing Micaceous Iron Oxide. Economical high build primer or intermediate coat.",
    volumeSolidsPercent: 50,
    dft: { minUm: 50, maxUm: 100, typicalUm: 75 },
    spreadingRateM2PerL: null,
    vocGPerL: null,
    flashPointC: null,
    potLifeHours: null,
    shelfLifeMonths: null,
    heatResistance: { continuousC: 93, peakC: 121, immersionC: null },
    applicationTemp: { minSubstrateC: 10, maxSubstrateC: 43, minAirC: 10, maxAirC: 43 },
    curingAt23C: { touchDryHours: 0.75, overcoatMinHours: 6, fullCureDays: 2 },
    surfaceTolerant: false,
    surfacePrep: { minimum: "Sa 2", recommended: "Sa 2½" },
    approvals: [],
    corrosivityCategories: ["C2", "C3", "C4"],
    compatiblePreviousCoats: ["zinc-rich-epoxy", "epoxy"],
    compatibleSubsequentCoats: ["epoxy", "vinyl", "polyurethane"],
    tdsDate: "2017-02-01",
    features: ["MIO pigmented", "Good flexibility", "Very good abrasion resistance", "Economical"],
  },
  {
    id: "jotun-penguard-express-mio",
    name: "Penguard Express MIO",
    supplier: "Jotun",
    genericType: "epoxy-mio",
    productRole: "intermediate",
    description:
      "Two component polyamide cured epoxy coating pigmented with Micaceous Iron Oxide. Fast drying with excellent barrier properties.",
    volumeSolidsPercent: 74,
    dft: { minUm: 75, maxUm: 250, typicalUm: 100 },
    spreadingRateM2PerL: null,
    vocGPerL: null,
    flashPointC: null,
    potLifeHours: null,
    shelfLifeMonths: null,
    heatResistance: { continuousC: 120, peakC: 140, immersionC: null },
    applicationTemp: { minSubstrateC: -5, maxSubstrateC: 40, minAirC: -5, maxAirC: 40 },
    curingAt23C: { touchDryHours: 1, overcoatMinHours: 3, fullCureDays: 7 },
    surfaceTolerant: false,
    surfacePrep: { minimum: "St 3", recommended: "Sa 2½" },
    approvals: ["NORSOK M-501"],
    corrosivityCategories: ["C3", "C4", "C5", "CX"],
    compatiblePreviousCoats: ["zinc-rich-epoxy", "zinc-silicate", "epoxy"],
    compatibleSubsequentCoats: ["polyurethane", "epoxy", "polysiloxane"],
    tdsDate: "2014-08-01",
    features: [
      "MIO pigmented",
      "Fast drying",
      "Low temperature application",
      "Excellent barrier properties",
    ],
  },
  {
    id: "sigma-sigmazinc-109-hs",
    name: "SigmaZinc 109 HS",
    supplier: "Sigma",
    genericType: "zinc-rich-epoxy",
    productRole: "primer",
    description:
      "Two component high solids zinc rich epoxy primer conforming to SSPC Paint 20 Level 2. For atmospheric exposure on steel.",
    volumeSolidsPercent: 66,
    dft: { minUm: 60, maxUm: 150, typicalUm: 75 },
    spreadingRateM2PerL: null,
    vocGPerL: null,
    flashPointC: null,
    potLifeHours: null,
    shelfLifeMonths: null,
    heatResistance: { continuousC: 120, peakC: 140, immersionC: null },
    applicationTemp: { minSubstrateC: 5, maxSubstrateC: 40, minAirC: 5, maxAirC: 40 },
    curingAt23C: { touchDryHours: 0.5, overcoatMinHours: 4, fullCureDays: 7 },
    surfaceTolerant: false,
    surfacePrep: { minimum: "Sa 2", recommended: "Sa 2½" },
    approvals: ["SSPC Paint 20 Level 2", "ISO 12944-5"],
    corrosivityCategories: ["C3", "C4", "C5", "CX"],
    compatiblePreviousCoats: [],
    compatibleSubsequentCoats: ["epoxy", "epoxy-mio", "polyurethane", "polysiloxane"],
    tdsDate: "2019-05-01",
    features: [
      "High zinc content",
      "SSPC Paint 20 compliant",
      "Fast drying",
      "Excellent cathodic protection",
    ],
  },
  {
    id: "stoncor-carbozinc-11",
    name: "Carbozinc 11",
    supplier: "StonCor",
    genericType: "zinc-silicate",
    productRole: "primer",
    description:
      "Single component moisture-cured inorganic zinc silicate primer. Exceptional heat and solvent resistance. Self-healing properties.",
    volumeSolidsPercent: 62,
    dft: { minUm: 50, maxUm: 150, typicalUm: 75 },
    spreadingRateM2PerL: null,
    vocGPerL: null,
    flashPointC: null,
    potLifeHours: null,
    shelfLifeMonths: null,
    heatResistance: { continuousC: 400, peakC: 540, immersionC: null },
    applicationTemp: { minSubstrateC: -18, maxSubstrateC: 43, minAirC: -18, maxAirC: 43 },
    curingAt23C: { touchDryHours: 0.5, overcoatMinHours: 24, fullCureDays: 3 },
    surfaceTolerant: false,
    surfacePrep: { minimum: "Sa 2½", recommended: "Sa 3" },
    approvals: ["SSPC Paint 20 Level 1"],
    corrosivityCategories: ["C4", "C5", "CX"],
    compatiblePreviousCoats: [],
    compatibleSubsequentCoats: ["epoxy", "epoxy-mio", "polyurethane", "polysiloxane"],
    tdsDate: "2020-01-01",
    features: [
      "Inorganic zinc silicate",
      "Extreme heat resistance",
      "Self-healing",
      "Solvent resistant",
      "Weldable",
    ],
  },
  {
    id: "stoncor-carboguard-890",
    name: "Carboguard 890",
    supplier: "StonCor",
    genericType: "epoxy-mastic",
    productRole: "multi-purpose",
    description:
      "Highly chemical resistant cycloaliphatic amine epoxy mastic. Self-priming and surface tolerant. Suitable for immersion service.",
    volumeSolidsPercent: 75,
    dft: { minUm: 100, maxUm: 250, typicalUm: 150 },
    spreadingRateM2PerL: null,
    vocGPerL: null,
    flashPointC: null,
    potLifeHours: null,
    shelfLifeMonths: null,
    heatResistance: { continuousC: 149, peakC: 177, immersionC: 93 },
    applicationTemp: { minSubstrateC: 10, maxSubstrateC: 52, minAirC: 10, maxAirC: 43 },
    curingAt23C: { touchDryHours: 4, overcoatMinHours: 4, fullCureDays: 1 },
    surfaceTolerant: true,
    surfacePrep: { minimum: "St 2", recommended: "Sa 2½" },
    approvals: ["USDA inspected facilities", "ASTM E84 Class A"],
    corrosivityCategories: ["C3", "C4", "C5", "CX"],
    compatiblePreviousCoats: ["zinc-silicate", "zinc-rich-epoxy", "epoxy"],
    compatibleSubsequentCoats: ["epoxy", "polyurethane"],
    tdsDate: "2015-11-01",
    features: [
      "Chemical resistant",
      "Surface tolerant",
      "Self-priming",
      "Immersion rated",
      "Very good abrasion resistance",
    ],
  },
  {
    id: "stoncor-carboguard-550",
    name: "Carboguard 550 ZA",
    supplier: "StonCor",
    genericType: "epoxy",
    productRole: "multi-purpose",
    description:
      "Solvent-free epoxy polyamine tank lining. Self-priming with excellent adhesion, flexibility and abrasion resistance. Potable water approved.",
    volumeSolidsPercent: 100,
    dft: { minUm: 250, maxUm: 500, typicalUm: 250 },
    spreadingRateM2PerL: null,
    vocGPerL: null,
    flashPointC: null,
    potLifeHours: null,
    shelfLifeMonths: null,
    heatResistance: { continuousC: 65, peakC: 82, immersionC: 60 },
    applicationTemp: { minSubstrateC: 10, maxSubstrateC: 45, minAirC: 6, maxAirC: 43 },
    curingAt23C: { touchDryHours: 6, overcoatMinHours: 8, fullCureDays: 7 },
    surfaceTolerant: false,
    surfacePrep: { minimum: "Sa 2½", recommended: "Sa 2½" },
    approvals: ["Potable water approved"],
    corrosivityCategories: ["C3", "C4", "C5"],
    compatiblePreviousCoats: [],
    compatibleSubsequentCoats: ["epoxy"],
    tdsDate: "2012-03-01",
    features: [
      "Solvent-free",
      "Potable water approved",
      "Excellent abrasion resistance",
      "Tank lining",
      "Self-priming",
    ],
  },
  {
    id: "hempel-hempadur-45143",
    name: "Hempadur 45143",
    supplier: "Hempel",
    genericType: "epoxy",
    productRole: "multi-purpose",
    description:
      "Two component polyamide adduct cured epoxy paint with good wetting properties and low water permeability. Self-priming, hard and tough coating with good abrasion and impact resistance.",
    volumeSolidsPercent: 60,
    dft: { minUm: 100, maxUm: 200, typicalUm: 150 },
    spreadingRateM2PerL: null,
    vocGPerL: null,
    flashPointC: null,
    potLifeHours: null,
    shelfLifeMonths: null,
    heatResistance: { continuousC: 150, peakC: 150, immersionC: null },
    applicationTemp: { minSubstrateC: -10, maxSubstrateC: 40, minAirC: -10, maxAirC: 40 },
    curingAt23C: { touchDryHours: 5, overcoatMinHours: 8, fullCureDays: 20 },
    surfaceTolerant: true,
    surfacePrep: { minimum: "St 2", recommended: "Sa 2½" },
    approvals: ["FDA 175.300", "Germanischer Lloyd ballast tank"],
    corrosivityCategories: ["C3", "C4", "C5", "CX"],
    compatiblePreviousCoats: ["zinc-rich-epoxy", "zinc-silicate", "epoxy"],
    compatibleSubsequentCoats: ["polyurethane", "epoxy"],
    tdsDate: "2024-01-01",
    features: [
      "Self-priming",
      "High build",
      "Seawater resistant",
      "Grain cargo approved",
      "Cold climate application",
    ],
  },
  {
    id: "hempel-hempathane-hs-55610",
    name: "Hempathane HS 55610",
    supplier: "Hempel",
    genericType: "polyurethane",
    productRole: "topcoat",
    description:
      "Two component high solids aliphatic acrylic polyurethane topcoat. Excellent gloss and colour retention with good chemical resistance.",
    volumeSolidsPercent: 62,
    dft: { minUm: 50, maxUm: 80, typicalUm: 60 },
    spreadingRateM2PerL: null,
    vocGPerL: null,
    flashPointC: null,
    potLifeHours: null,
    shelfLifeMonths: null,
    heatResistance: { continuousC: 120, peakC: 140, immersionC: null },
    applicationTemp: { minSubstrateC: 5, maxSubstrateC: 40, minAirC: 5, maxAirC: 40 },
    curingAt23C: { touchDryHours: 3, overcoatMinHours: 6, fullCureDays: 7 },
    surfaceTolerant: false,
    surfacePrep: { minimum: "Clean dry surface", recommended: "Clean dry surface" },
    approvals: ["NORSOK M-501"],
    corrosivityCategories: ["C3", "C4", "C5", "CX"],
    compatiblePreviousCoats: ["epoxy", "epoxy-mio", "zinc-rich-epoxy"],
    compatibleSubsequentCoats: [],
    tdsDate: "2024-01-01",
    features: [
      "High solids",
      "Excellent gloss retention",
      "UV resistant",
      "Contains zinc phosphate",
    ],
  },
  {
    id: "ppg-amercoat-385",
    name: "Amercoat 385",
    supplier: "PPG",
    genericType: "epoxy",
    productRole: "multi-purpose",
    description:
      "Two component high build polyamide epoxy with high solids content. Forms a tough, abrasion-resistant, durable film for industrial and marine use.",
    volumeSolidsPercent: 68,
    dft: { minUm: 100, maxUm: 200, typicalUm: 150 },
    spreadingRateM2PerL: null,
    vocGPerL: null,
    flashPointC: null,
    potLifeHours: null,
    shelfLifeMonths: null,
    heatResistance: { continuousC: 120, peakC: 150, immersionC: 65 },
    applicationTemp: { minSubstrateC: 5, maxSubstrateC: 40, minAirC: 5, maxAirC: 40 },
    curingAt23C: { touchDryHours: 4, overcoatMinHours: 8, fullCureDays: 7 },
    surfaceTolerant: true,
    surfacePrep: { minimum: "St 2", recommended: "Sa 2½" },
    approvals: [],
    corrosivityCategories: ["C3", "C4", "C5"],
    compatiblePreviousCoats: ["zinc-rich-epoxy", "zinc-silicate", "epoxy"],
    compatibleSubsequentCoats: ["polyurethane", "epoxy"],
    tdsDate: "2024-01-01",
    features: ["High build", "High solids", "Abrasion resistant", "Glass flake additive available"],
  },
  {
    id: "ppg-sigmashield-880",
    name: "SigmaShield 880",
    supplier: "PPG",
    genericType: "epoxy",
    productRole: "multi-purpose",
    description:
      "Glass flake reinforced epoxy coating providing exceptional barrier protection. Excellent chemical and abrasion resistance for severe service.",
    volumeSolidsPercent: 75,
    dft: { minUm: 150, maxUm: 350, typicalUm: 250 },
    spreadingRateM2PerL: null,
    vocGPerL: null,
    flashPointC: null,
    potLifeHours: null,
    shelfLifeMonths: null,
    heatResistance: { continuousC: 100, peakC: 120, immersionC: 80 },
    applicationTemp: { minSubstrateC: 5, maxSubstrateC: 40, minAirC: 5, maxAirC: 40 },
    curingAt23C: { touchDryHours: 6, overcoatMinHours: 12, fullCureDays: 7 },
    surfaceTolerant: false,
    surfacePrep: { minimum: "Sa 2", recommended: "Sa 2½" },
    approvals: [],
    corrosivityCategories: ["C4", "C5", "CX"],
    compatiblePreviousCoats: ["zinc-rich-epoxy", "epoxy"],
    compatibleSubsequentCoats: ["epoxy", "polyurethane"],
    tdsDate: "2024-01-01",
    features: [
      "Glass flake reinforced",
      "Exceptional barrier protection",
      "Chemical resistant",
      "Severe service",
    ],
  },
  {
    id: "carboline-carboguard-60",
    name: "Carboguard 60",
    supplier: "Carboline",
    genericType: "epoxy",
    productRole: "multi-purpose",
    description:
      "High solids versatile abrasion resistant chemical resistant epoxy. Can be used as primer, intermediate or self-priming finish over steel or inorganic zinc primers.",
    volumeSolidsPercent: 73,
    dft: { minUm: 125, maxUm: 250, typicalUm: 175 },
    spreadingRateM2PerL: null,
    vocGPerL: null,
    flashPointC: null,
    potLifeHours: null,
    shelfLifeMonths: null,
    heatResistance: { continuousC: 120, peakC: 150, immersionC: 65 },
    applicationTemp: { minSubstrateC: 5, maxSubstrateC: 45, minAirC: 5, maxAirC: 40 },
    curingAt23C: { touchDryHours: 4, overcoatMinHours: 8, fullCureDays: 7 },
    surfaceTolerant: true,
    surfacePrep: { minimum: "St 2", recommended: "Sa 2½" },
    approvals: ["ISO 12944"],
    corrosivityCategories: ["C3", "C4", "C5", "CX"],
    compatiblePreviousCoats: ["zinc-rich-epoxy", "zinc-silicate", "epoxy"],
    compatibleSubsequentCoats: ["polyurethane", "epoxy"],
    tdsDate: "2024-01-01",
    features: [
      "High solids",
      "Abrasion resistant",
      "Chemical resistant",
      "MIO additive available",
      "Glass flake option",
    ],
  },
  {
    id: "carboline-carbomastic-15",
    name: "Carbomastic 15",
    supplier: "Carboline",
    genericType: "epoxy-mastic",
    productRole: "multi-purpose",
    description:
      "Aluminum pigmented low-stress high-solids mastic with lamellar aluminum pigment for superior barrier protection. Pioneer mastic coating with proven field history.",
    volumeSolidsPercent: 72,
    dft: { minUm: 100, maxUm: 200, typicalUm: 125 },
    spreadingRateM2PerL: null,
    vocGPerL: null,
    flashPointC: null,
    potLifeHours: null,
    shelfLifeMonths: null,
    heatResistance: { continuousC: 120, peakC: 150, immersionC: null },
    applicationTemp: { minSubstrateC: 0, maxSubstrateC: 50, minAirC: 0, maxAirC: 50 },
    curingAt23C: { touchDryHours: 2, overcoatMinHours: 4, fullCureDays: 5 },
    surfaceTolerant: true,
    surfacePrep: { minimum: "St 2", recommended: "Sa 2" },
    approvals: [],
    corrosivityCategories: ["C2", "C3", "C4", "C5"],
    compatiblePreviousCoats: ["zinc-rich-epoxy", "zinc-silicate", "epoxy", "alkyd"],
    compatibleSubsequentCoats: ["polyurethane", "epoxy", "acrylic"],
    tdsDate: "2023-05-01",
    features: [
      "Aluminum pigmented",
      "Lamellar barrier protection",
      "Surface tolerant",
      "Low stress",
      "Proven field history",
    ],
  },
  {
    id: "carboline-carbozinc-11-hs",
    name: "Carbozinc 11 HS",
    supplier: "Carboline",
    genericType: "zinc-silicate",
    productRole: "primer",
    description:
      "High solids single component moisture-cured inorganic zinc silicate primer. Exceptional heat and solvent resistance with self-healing properties.",
    volumeSolidsPercent: 68,
    dft: { minUm: 50, maxUm: 125, typicalUm: 75 },
    spreadingRateM2PerL: null,
    vocGPerL: null,
    flashPointC: null,
    potLifeHours: null,
    shelfLifeMonths: null,
    heatResistance: { continuousC: 400, peakC: 540, immersionC: null },
    applicationTemp: { minSubstrateC: -18, maxSubstrateC: 50, minAirC: -18, maxAirC: 50 },
    curingAt23C: { touchDryHours: 0.5, overcoatMinHours: 24, fullCureDays: 3 },
    surfaceTolerant: false,
    surfacePrep: { minimum: "Sa 2½", recommended: "Sa 3" },
    approvals: ["SSPC Paint 20 Level 1"],
    corrosivityCategories: ["C4", "C5", "CX"],
    compatiblePreviousCoats: [],
    compatibleSubsequentCoats: ["epoxy", "epoxy-mio", "polyurethane"],
    tdsDate: "2024-01-01",
    features: [
      "High solids",
      "Inorganic zinc silicate",
      "Extreme heat resistance",
      "Self-healing",
      "Weldable",
      "Solvent resistant",
    ],
  },
  {
    id: "international-interthane-990",
    name: "Interthane 990",
    supplier: "International",
    genericType: "polyurethane",
    productRole: "topcoat",
    description:
      "Two component high gloss aliphatic acrylic polyurethane cosmetic finish. Capable of drying to low temperatures with excellent durability and aesthetics retention.",
    volumeSolidsPercent: 55,
    dft: { minUm: 50, maxUm: 75, typicalUm: 50 },
    spreadingRateM2PerL: null,
    vocGPerL: null,
    flashPointC: null,
    potLifeHours: null,
    shelfLifeMonths: null,
    heatResistance: { continuousC: 93, peakC: 120, immersionC: null },
    applicationTemp: { minSubstrateC: -5, maxSubstrateC: 40, minAirC: -5, maxAirC: 40 },
    curingAt23C: { touchDryHours: 3, overcoatMinHours: 8, fullCureDays: 7 },
    surfaceTolerant: false,
    surfacePrep: { minimum: "Clean dry surface", recommended: "Clean dry surface" },
    approvals: [],
    corrosivityCategories: ["C3", "C4", "C5", "CX"],
    compatiblePreviousCoats: ["epoxy", "epoxy-mio", "zinc-rich-epoxy"],
    compatibleSubsequentCoats: [],
    tdsDate: "2024-01-01",
    features: [
      "High gloss",
      "Excellent colour retention",
      "Low temperature cure",
      "20+ year track record",
      "Extended recoat windows",
    ],
  },
  {
    id: "international-interzone-954",
    name: "Interzone 954",
    supplier: "International",
    genericType: "epoxy",
    productRole: "multi-purpose",
    description:
      "Two component low VOC high solids modified epoxy barrier coating. Single coat application with excellent cathodic disbondment resistance.",
    volumeSolidsPercent: 80,
    dft: { minUm: 200, maxUm: 500, typicalUm: 350 },
    spreadingRateM2PerL: null,
    vocGPerL: null,
    flashPointC: null,
    potLifeHours: null,
    shelfLifeMonths: null,
    heatResistance: { continuousC: 100, peakC: 120, immersionC: 80 },
    applicationTemp: { minSubstrateC: 5, maxSubstrateC: 40, minAirC: 5, maxAirC: 40 },
    curingAt23C: { touchDryHours: 6, overcoatMinHours: 12, fullCureDays: 7 },
    surfaceTolerant: false,
    surfacePrep: { minimum: "Sa 2", recommended: "Sa 2½" },
    approvals: [],
    corrosivityCategories: ["C4", "C5", "CX"],
    compatiblePreviousCoats: ["zinc-rich-epoxy", "epoxy"],
    compatibleSubsequentCoats: ["polyurethane", "epoxy"],
    tdsDate: "2024-01-01",
    features: [
      "High solids",
      "Low VOC",
      "Single coat application",
      "Cathodic disbondment resistant",
      "Cures when immersed",
    ],
  },
  {
    id: "international-interzone-954gf",
    name: "Interzone 954GF",
    supplier: "International",
    genericType: "epoxy-glass-flake",
    productRole: "multi-purpose",
    description:
      "High solids low VOC epoxy barrier coat reinforced with chemically resistant high aspect ratio lamellar glass flake for enhanced durability and abrasion protection.",
    volumeSolidsPercent: 68,
    dft: { minUm: 300, maxUm: 500, typicalUm: 500 },
    spreadingRateM2PerL: null,
    vocGPerL: null,
    flashPointC: null,
    potLifeHours: null,
    shelfLifeMonths: null,
    heatResistance: { continuousC: 100, peakC: 120, immersionC: 80 },
    applicationTemp: { minSubstrateC: 5, maxSubstrateC: 40, minAirC: 5, maxAirC: 40 },
    curingAt23C: { touchDryHours: 8, overcoatMinHours: 16, fullCureDays: 7 },
    surfaceTolerant: false,
    surfacePrep: { minimum: "Sa 2", recommended: "Sa 2½" },
    approvals: [],
    corrosivityCategories: ["C4", "C5", "CX"],
    compatiblePreviousCoats: ["zinc-rich-epoxy", "epoxy"],
    compatibleSubsequentCoats: ["polyurethane", "epoxy"],
    tdsDate: "2024-01-01",
    features: [
      "Glass flake reinforced",
      "High abrasion resistance",
      "Low VOC",
      "Enhanced barrier protection",
      "Chemical resistant",
    ],
  },
  {
    id: "sherwin-williams-macropoxy-646",
    name: "Macropoxy 646",
    supplier: "Sherwin-Williams",
    genericType: "epoxy",
    productRole: "multi-purpose",
    description:
      "High solids high build fast drying polyamide epoxy for steel and concrete protection. Semi-gloss finish with excellent abrasion resistance.",
    volumeSolidsPercent: 72,
    dft: { minUm: 100, maxUm: 250, typicalUm: 150 },
    spreadingRateM2PerL: null,
    vocGPerL: null,
    flashPointC: null,
    potLifeHours: null,
    shelfLifeMonths: null,
    heatResistance: { continuousC: 120, peakC: 150, immersionC: 65 },
    applicationTemp: { minSubstrateC: 2, maxSubstrateC: 45, minAirC: 2, maxAirC: 45 },
    curingAt23C: { touchDryHours: 2, overcoatMinHours: 4, fullCureDays: 7 },
    surfaceTolerant: true,
    surfacePrep: { minimum: "St 2", recommended: "Sa 2½" },
    approvals: [],
    corrosivityCategories: ["C3", "C4", "C5"],
    compatiblePreviousCoats: ["zinc-rich-epoxy", "zinc-silicate", "epoxy"],
    compatibleSubsequentCoats: ["polyurethane", "epoxy"],
    tdsDate: "2024-01-01",
    features: [
      "Fast drying",
      "High build",
      "Abrasion resistant",
      "Salt water immersion",
      "Class A slip coefficient",
    ],
  },
  {
    id: "sherwin-williams-macropoxy-646pw",
    name: "Macropoxy 646 PW",
    supplier: "Sherwin-Williams",
    genericType: "epoxy",
    productRole: "multi-purpose",
    description:
      "High solids high build fast drying polyamide epoxy classified to ANSI/NSF 61 for potable water tank linings.",
    volumeSolidsPercent: 72,
    dft: { minUm: 125, maxUm: 500, typicalUm: 250 },
    spreadingRateM2PerL: null,
    vocGPerL: null,
    flashPointC: null,
    potLifeHours: null,
    shelfLifeMonths: null,
    heatResistance: { continuousC: 65, peakC: 82, immersionC: 60 },
    applicationTemp: { minSubstrateC: 2, maxSubstrateC: 45, minAirC: 2, maxAirC: 45 },
    curingAt23C: { touchDryHours: 2, overcoatMinHours: 4, fullCureDays: 7 },
    surfaceTolerant: false,
    surfacePrep: { minimum: "Sa 2½", recommended: "Sa 2½" },
    approvals: ["ANSI/NSF 61", "Potable water approved"],
    corrosivityCategories: ["C3", "C4", "C5"],
    compatiblePreviousCoats: [],
    compatibleSubsequentCoats: [],
    tdsDate: "2024-01-01",
    features: [
      "Potable water approved",
      "NSF 61 certified",
      "Tank lining",
      "High build",
      "Fast drying",
    ],
  },
  {
    id: "sherwin-williams-macropoxy-400",
    name: "Macropoxy 400",
    supplier: "Sherwin-Williams",
    genericType: "zinc-rich-epoxy",
    productRole: "primer",
    description:
      "Zinc phosphate epoxy primer with excellent corrosion protection. High solids formulation for atmospheric and immersion service.",
    volumeSolidsPercent: 70,
    dft: { minUm: 75, maxUm: 275, typicalUm: 125 },
    spreadingRateM2PerL: null,
    vocGPerL: null,
    flashPointC: null,
    potLifeHours: null,
    shelfLifeMonths: null,
    heatResistance: { continuousC: 120, peakC: 150, immersionC: null },
    applicationTemp: { minSubstrateC: 5, maxSubstrateC: 40, minAirC: 5, maxAirC: 40 },
    curingAt23C: { touchDryHours: 1, overcoatMinHours: 4, fullCureDays: 7 },
    surfaceTolerant: false,
    surfacePrep: { minimum: "Sa 2", recommended: "Sa 2½" },
    approvals: [],
    corrosivityCategories: ["C3", "C4", "C5"],
    compatiblePreviousCoats: [],
    compatibleSubsequentCoats: ["epoxy", "polyurethane"],
    tdsDate: "2024-01-01",
    features: ["Zinc phosphate", "High solids", "Fast drying", "Immersion rated"],
  },
  {
    id: "generic-polyurea-aromatic",
    name: "Aromatic Polyurea Coating",
    supplier: "Generic",
    genericType: "polyurea",
    productRole: "multi-purpose",
    description:
      "Fast-curing 100% solids aromatic polyurea coating. Spray-applied with 10-30 second gel time. Exceptional abrasion and chemical resistance.",
    volumeSolidsPercent: 100,
    dft: { minUm: 800, maxUm: 3000, typicalUm: 1500 },
    spreadingRateM2PerL: null,
    vocGPerL: null,
    flashPointC: null,
    potLifeHours: null,
    shelfLifeMonths: null,
    heatResistance: { continuousC: 120, peakC: 150, immersionC: 80 },
    applicationTemp: { minSubstrateC: -40, maxSubstrateC: 50, minAirC: -40, maxAirC: 50 },
    curingAt23C: { touchDryHours: 0.02, overcoatMinHours: 0.5, fullCureDays: 1 },
    surfaceTolerant: false,
    surfacePrep: { minimum: "Sa 2", recommended: "Sa 2½" },
    approvals: [],
    corrosivityCategories: ["C4", "C5", "CX"],
    compatiblePreviousCoats: ["epoxy", "zinc-rich-epoxy"],
    compatibleSubsequentCoats: ["polyurea"],
    tdsDate: "2024-01-01",
    features: [
      "100% solids",
      "10-30 second gel time",
      "Extreme abrasion resistance",
      "High elongation (500%+)",
      "Low temperature cure",
      "40 MPa tensile strength",
    ],
  },
  {
    id: "generic-fbe-standard",
    name: "Fusion Bonded Epoxy (FBE) Standard",
    supplier: "Generic",
    genericType: "fbe",
    productRole: "primer",
    description:
      "Single layer fusion bonded epoxy coating for external pipeline protection. Factory applied powder coating per ISO 21809-2. Service temperature up to 90C.",
    volumeSolidsPercent: 100,
    dft: { minUm: 350, maxUm: 500, typicalUm: 400 },
    spreadingRateM2PerL: null,
    vocGPerL: null,
    flashPointC: null,
    potLifeHours: null,
    shelfLifeMonths: null,
    heatResistance: { continuousC: 90, peakC: 110, immersionC: 90 },
    applicationTemp: { minSubstrateC: 180, maxSubstrateC: 250, minAirC: 180, maxAirC: 250 },
    curingAt23C: { touchDryHours: 0.1, overcoatMinHours: 0, fullCureDays: 0 },
    surfaceTolerant: false,
    surfacePrep: { minimum: "Sa 2½", recommended: "Sa 3" },
    approvals: ["ISO 21809-2", "CSA Z245.20"],
    corrosivityCategories: ["C4", "C5", "CX"],
    compatiblePreviousCoats: [],
    compatibleSubsequentCoats: [],
    tdsDate: "2024-01-01",
    features: [
      "Factory applied",
      "Powder coating",
      "Pipeline protection",
      "Cathodic protection compatible",
      "ISO 21809-2 compliant",
    ],
  },
  {
    id: "generic-3lpe",
    name: "3-Layer Polyethylene (3LPE)",
    supplier: "Generic",
    genericType: "3lpe",
    productRole: "multi-purpose",
    description:
      "Three layer polyethylene coating system: FBE primer, adhesive layer, and polyethylene topcoat. For buried pipeline protection per ISO 21809-1.",
    volumeSolidsPercent: 100,
    dft: { minUm: 1800, maxUm: 3000, typicalUm: 2500 },
    spreadingRateM2PerL: null,
    vocGPerL: null,
    flashPointC: null,
    potLifeHours: null,
    shelfLifeMonths: null,
    heatResistance: { continuousC: 80, peakC: 100, immersionC: 80 },
    applicationTemp: { minSubstrateC: 180, maxSubstrateC: 250, minAirC: 180, maxAirC: 250 },
    curingAt23C: { touchDryHours: 0.1, overcoatMinHours: 0, fullCureDays: 0 },
    surfaceTolerant: false,
    surfacePrep: { minimum: "Sa 2½", recommended: "Sa 3" },
    approvals: ["ISO 21809-1", "DIN 30670"],
    corrosivityCategories: ["C4", "C5", "CX"],
    compatiblePreviousCoats: [],
    compatibleSubsequentCoats: [],
    tdsDate: "2024-01-01",
    features: [
      "Factory applied",
      "Buried pipeline protection",
      "Mechanical damage resistant",
      "Cathodic protection compatible",
      "ISO 21809-1 compliant",
    ],
  },
  {
    id: "jotun-hardtop-flexi",
    name: "Hardtop Flexi",
    supplier: "Jotun",
    genericType: "polysiloxane",
    productRole: "topcoat",
    description:
      "Two component chemically curing acrylic polysiloxane topcoat. High gloss finish with excellent colour and gloss retention. Isocyanate-free formulation.",
    volumeSolidsPercent: 65,
    dft: { minUm: 50, maxUm: 100, typicalUm: 75 },
    spreadingRateM2PerL: null,
    vocGPerL: null,
    flashPointC: null,
    potLifeHours: null,
    shelfLifeMonths: null,
    heatResistance: { continuousC: 150, peakC: 180, immersionC: null },
    applicationTemp: { minSubstrateC: 0, maxSubstrateC: 40, minAirC: 0, maxAirC: 40 },
    curingAt23C: { touchDryHours: 4, overcoatMinHours: 8, fullCureDays: 7 },
    surfaceTolerant: false,
    surfacePrep: { minimum: "Clean dry surface", recommended: "Clean dry surface" },
    approvals: ["NORSOK M-501"],
    corrosivityCategories: ["C3", "C4", "C5", "CX"],
    compatiblePreviousCoats: ["epoxy", "epoxy-mio", "zinc-rich-epoxy"],
    compatibleSubsequentCoats: [],
    tdsDate: "2024-01-01",
    features: [
      "Isocyanate-free",
      "Excellent gloss retention",
      "Low VOC",
      "Flexible coating",
      "NORSOK approved",
    ],
  },
  {
    id: "jotun-hardtop-pro",
    name: "Hardtop Pro",
    supplier: "Jotun",
    genericType: "polysiloxane",
    productRole: "topcoat",
    description:
      "Two component high solids acrylic polysiloxane coating. No isocyanates. High gloss with very good mechanical properties and chemical resistance.",
    volumeSolidsPercent: 70,
    dft: { minUm: 50, maxUm: 150, typicalUm: 75 },
    spreadingRateM2PerL: null,
    vocGPerL: null,
    flashPointC: null,
    potLifeHours: null,
    shelfLifeMonths: null,
    heatResistance: { continuousC: 150, peakC: 180, immersionC: null },
    applicationTemp: { minSubstrateC: 0, maxSubstrateC: 40, minAirC: 0, maxAirC: 40 },
    curingAt23C: { touchDryHours: 3, overcoatMinHours: 6, fullCureDays: 7 },
    surfaceTolerant: false,
    surfacePrep: { minimum: "Clean dry surface", recommended: "Clean dry surface" },
    approvals: ["NORSOK M-501"],
    corrosivityCategories: ["C3", "C4", "C5", "CX"],
    compatiblePreviousCoats: ["epoxy", "epoxy-mio", "zinc-rich-epoxy"],
    compatibleSubsequentCoats: ["polysiloxane"],
    tdsDate: "2024-01-01",
    features: [
      "Isocyanate-free",
      "High solids",
      "Extended gloss retention",
      "Fully recoatable",
      "Cures to 0C",
    ],
  },
  {
    id: "international-intertherm-50",
    name: "Intertherm 50",
    supplier: "International",
    genericType: "high-temp-silicone",
    productRole: "topcoat",
    description:
      "Single component moisture curing silicone coating for high temperature service up to 540C. Multiple coats without heat curing.",
    volumeSolidsPercent: 35,
    dft: { minUm: 25, maxUm: 75, typicalUm: 50 },
    spreadingRateM2PerL: null,
    vocGPerL: null,
    flashPointC: null,
    potLifeHours: null,
    shelfLifeMonths: null,
    heatResistance: { continuousC: 400, peakC: 540, immersionC: null },
    applicationTemp: { minSubstrateC: 5, maxSubstrateC: 40, minAirC: 5, maxAirC: 40 },
    curingAt23C: { touchDryHours: 0.5, overcoatMinHours: 4, fullCureDays: 7 },
    surfaceTolerant: false,
    surfacePrep: { minimum: "Sa 2", recommended: "Sa 2½" },
    approvals: [],
    corrosivityCategories: ["C3", "C4", "C5"],
    compatiblePreviousCoats: [],
    compatibleSubsequentCoats: ["high-temp-silicone"],
    tdsDate: "2024-01-01",
    features: [
      "Extreme heat resistance (540C)",
      "Moisture curing",
      "No heat cure required",
      "Flare stacks",
      "Exhaust systems",
    ],
  },
  {
    id: "generic-silicone-aluminum-400",
    name: "Silicone Aluminum High Temperature",
    supplier: "Generic",
    genericType: "high-temp-silicone",
    productRole: "multi-purpose",
    description:
      "Aluminum pigmented silicone coating for high temperature applications up to 400C continuous. Heat cure required for full properties.",
    volumeSolidsPercent: 40,
    dft: { minUm: 25, maxUm: 50, typicalUm: 40 },
    spreadingRateM2PerL: null,
    vocGPerL: null,
    flashPointC: null,
    potLifeHours: null,
    shelfLifeMonths: null,
    heatResistance: { continuousC: 400, peakC: 500, immersionC: null },
    applicationTemp: { minSubstrateC: 10, maxSubstrateC: 35, minAirC: 10, maxAirC: 35 },
    curingAt23C: { touchDryHours: 0.25, overcoatMinHours: 1, fullCureDays: 1 },
    surfaceTolerant: false,
    surfacePrep: { minimum: "Sa 2", recommended: "Sa 2½" },
    approvals: [],
    corrosivityCategories: ["C3", "C4"],
    compatiblePreviousCoats: [],
    compatibleSubsequentCoats: [],
    tdsDate: "2024-01-01",
    features: [
      "Heat resistant to 400C",
      "Aluminum pigmented",
      "Self-priming",
      "Boilers",
      "Exhaust stacks",
    ],
  },
  {
    id: "generic-intumescent-water",
    name: "Intumescent Fire Protection (Water-Based)",
    supplier: "Generic",
    genericType: "intumescent",
    productRole: "multi-purpose",
    description:
      "Water-based intumescent coating for structural steel fire protection. Expands up to 50x DFT when exposed to fire. Interior use only.",
    volumeSolidsPercent: 70,
    dft: { minUm: 500, maxUm: 2000, typicalUm: 1000 },
    spreadingRateM2PerL: null,
    vocGPerL: null,
    flashPointC: null,
    potLifeHours: null,
    shelfLifeMonths: null,
    heatResistance: { continuousC: 60, peakC: 80, immersionC: null },
    applicationTemp: { minSubstrateC: 5, maxSubstrateC: 35, minAirC: 5, maxAirC: 35 },
    curingAt23C: { touchDryHours: 2, overcoatMinHours: 24, fullCureDays: 7 },
    surfaceTolerant: false,
    surfacePrep: { minimum: "Sa 2", recommended: "Sa 2½" },
    approvals: ["ASTM E119", "UL 263", "BS 476"],
    corrosivityCategories: ["C2", "C3"],
    compatiblePreviousCoats: ["epoxy", "zinc-rich-epoxy"],
    compatibleSubsequentCoats: ["acrylic"],
    tdsDate: "2024-01-01",
    features: [
      "Fire protection 1-2 hours",
      "Water-based",
      "Low VOC",
      "Interior use",
      "Expands 50x in fire",
    ],
  },
  {
    id: "generic-intumescent-epoxy",
    name: "Intumescent Fire Protection (Epoxy-Based)",
    supplier: "Generic",
    genericType: "intumescent",
    productRole: "multi-purpose",
    description:
      "Epoxy-based intumescent coating for structural steel fire protection. Suitable for interior and exterior use. Higher film build per coat.",
    volumeSolidsPercent: 75,
    dft: { minUm: 1000, maxUm: 5000, typicalUm: 2500 },
    spreadingRateM2PerL: null,
    vocGPerL: null,
    flashPointC: null,
    potLifeHours: null,
    shelfLifeMonths: null,
    heatResistance: { continuousC: 80, peakC: 100, immersionC: null },
    applicationTemp: { minSubstrateC: 5, maxSubstrateC: 40, minAirC: 5, maxAirC: 40 },
    curingAt23C: { touchDryHours: 4, overcoatMinHours: 12, fullCureDays: 7 },
    surfaceTolerant: false,
    surfacePrep: { minimum: "Sa 2", recommended: "Sa 2½" },
    approvals: ["ASTM E119", "UL 263", "EN 13381-8"],
    corrosivityCategories: ["C3", "C4", "C5"],
    compatiblePreviousCoats: ["epoxy", "zinc-rich-epoxy"],
    compatibleSubsequentCoats: ["epoxy", "polyurethane"],
    tdsDate: "2024-01-01",
    features: [
      "Fire protection 2-3 hours",
      "Epoxy-based",
      "Interior/exterior",
      "High build",
      "Chemical resistant char",
    ],
  },
];

export function productsBySupplier(supplier: PaintSupplier): PaintProduct[] {
  return paintProducts.filter((p) => p.supplier === supplier);
}

export function productsByRole(role: ProductRole): PaintProduct[] {
  return paintProducts.filter((p) => p.productRole === role);
}

export function productsByGenericType(type: GenericType): PaintProduct[] {
  return paintProducts.filter((p) => p.genericType === type);
}

export function productsForCorrosivity(category: CorrosivityCategory): PaintProduct[] {
  return paintProducts.filter((p) => p.corrosivityCategories.includes(category));
}

export function primersForEnvironment(category: CorrosivityCategory): PaintProduct[] {
  return paintProducts.filter(
    (p) =>
      (p.productRole === "primer" || p.productRole === "multi-purpose") &&
      p.corrosivityCategories.includes(category),
  );
}

export function topcoatsForEnvironment(category: CorrosivityCategory): PaintProduct[] {
  return paintProducts.filter(
    (p) =>
      (p.productRole === "topcoat" || p.productRole === "multi-purpose") &&
      p.corrosivityCategories.includes(category),
  );
}

export function surfaceTolerantProducts(): PaintProduct[] {
  return paintProducts.filter((p) => p.surfaceTolerant);
}

export function productsForTemperature(continuousC: number): PaintProduct[] {
  return paintProducts.filter((p) => p.heatResistance.continuousC >= continuousC);
}

export function compatibleTopcoats(primer: PaintProduct): PaintProduct[] {
  return paintProducts.filter(
    (p) =>
      (p.productRole === "topcoat" || p.productRole === "multi-purpose") &&
      primer.compatibleSubsequentCoats.includes(p.genericType),
  );
}

export function compatiblePrimers(topcoat: PaintProduct): PaintProduct[] {
  return paintProducts.filter(
    (p) =>
      (p.productRole === "primer" || p.productRole === "multi-purpose") &&
      topcoat.compatiblePreviousCoats.includes(p.genericType),
  );
}
