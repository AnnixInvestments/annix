import { RUBBER_PRICING_DEFAULTS } from "@annix/product-data/rubber";

export type RubberPriceFamily = "plate" | "pipe";

export interface RubberNbFactorConfig {
  nb: string;
  pie: number;
  additional: number;
}

export interface RubberLabourComponentConfig {
  department: string;
  m2PerHour: number;
}

export interface RubberFamilyPricingConfig {
  wastePct: number;
  markupFactor: number;
  mpsFactor: number;
  thicknessesMm: number[];
  rubberLining: RubberLabourComponentConfig;
  handling: RubberLabourComponentConfig;
  finishing: RubberLabourComponentConfig;
  solution: RubberLabourComponentConfig;
  cwAgentBaselinePerM2: Record<string, number>;
  cwRecipes?: Record<string, string[]>;
  defaultBondingAgentSupplier: string;
  cwAgentSupplierBaselines: Record<string, Record<string, number>>;
}

export interface RubberPipePricingConfig extends RubberFamilyPricingConfig {
  nbFactors: RubberNbFactorConfig[];
}

export interface RubberBlastingConfig {
  elecAvgRate: number;
  elecAvgKwh: number;
  gritBagCost: number;
  gritM2PerBag: number;
  m2PerHour: number;
  crewSize: number;
  margin: number;
}

export interface RubberParaffinConfig {
  ltrsPerCure: number;
  costPerLitre: number;
  m2PerPot: number;
}

export interface RubberPricingConfig {
  paraffin: RubberParaffinConfig;
  blasting: RubberBlastingConfig;
  deptAvgHourly: Record<string, number>;
  consumableMarkup: number;
  plate: RubberFamilyPricingConfig;
  pipe: RubberPipePricingConfig;
}

export const DEFAULT_RUBBER_PRICING_CONFIG: RubberPricingConfig = {
  paraffin: {
    ltrsPerCure: RUBBER_PRICING_DEFAULTS.paraffin.ltrsPerCure,
    costPerLitre: RUBBER_PRICING_DEFAULTS.paraffin.costPerLitre,
    m2PerPot: RUBBER_PRICING_DEFAULTS.paraffin.m2PerPot,
  },
  blasting: {
    elecAvgRate: RUBBER_PRICING_DEFAULTS.blasting.elecAvgRate,
    elecAvgKwh: RUBBER_PRICING_DEFAULTS.blasting.elecAvgKwh,
    gritBagCost: RUBBER_PRICING_DEFAULTS.blasting.gritBagCost,
    gritM2PerBag: RUBBER_PRICING_DEFAULTS.blasting.gritM2PerBag,
    m2PerHour: RUBBER_PRICING_DEFAULTS.blasting.blastM2PerHour,
    crewSize: 2,
    margin: RUBBER_PRICING_DEFAULTS.blasting.margin,
  },
  deptAvgHourly: {
    Blast: 62.06,
    Fork: 95.55,
    Finisher: 59.4867,
    "R/L": 72.004,
    Pipes: 69.38,
    Solution: 73.78,
  },
  consumableMarkup: RUBBER_PRICING_DEFAULTS.consumableMarkup,
  plate: {
    wastePct: RUBBER_PRICING_DEFAULTS.plate.wastePct,
    markupFactor: RUBBER_PRICING_DEFAULTS.plate.markupFactor,
    mpsFactor: RUBBER_PRICING_DEFAULTS.plate.mpsFactor,
    thicknessesMm: [...RUBBER_PRICING_DEFAULTS.plate.thicknessesMm],
    rubberLining: { department: "R/L", m2PerHour: 0.35 },
    handling: { department: "Fork", m2PerHour: 2 },
    finishing: { department: "Finisher", m2PerHour: 6 },
    solution: { department: "Solution", m2PerHour: 4 },
    cwAgentBaselinePerM2: {
      Natural: 179.4691,
      "Premium Natural": 179.4691,
      Butyl: 98.8738,
      Nitrile: 98.8738,
      Neoprene: 98.8738,
      Chemical: 277.9265,
      EPDM: 179.0565,
      Cured: 179.0565,
    },
    cwRecipes: {
      Natural: ["Toluene", "Herobond 80", "Herobond 82", "Herobond 86"],
      "Premium Natural": ["Toluene", "Herobond 80", "Herobond 82", "Herobond 86"],
      Butyl: ["Toluene", "Hero Line 105", "Herobond 200"],
      Nitrile: ["Toluene", "Hero Line 105", "Herobond 200"],
      Neoprene: ["Toluene", "Hero Line 105", "Herobond 200"],
      Chemical: ["Toluene", "Herobond 80", "Herobond 82", "Herobond 86", "Anchorcure/Ecorrcure"],
      EPDM: ["Toluene", "Hero Line 105", "Herobond 400 Red"],
      Cured: ["Toluene", "Hero Line 105", "Herobond 400 Red"],
    },
    defaultBondingAgentSupplier: "Impilo",
    cwAgentSupplierBaselines: {
      "Ty-Ply": {
        Natural: 321.0416,
        "Premium Natural": 321.0416,
        Butyl: 315.3806,
        Nitrile: 215.8371,
        Chemical: 413.8412,
        Cured: 258.8913,
      },
      Rema: {
        Natural: 194.2544,
        "Premium Natural": 194.2544,
        Butyl: 188.5934,
        Chemical: 292.715,
        Neoprene: 215.8371,
        EPDM: 215.8371,
      },
      Impilo: {
        Natural: 179.4691,
        "Premium Natural": 179.4691,
        Butyl: 98.8738,
        Nitrile: 98.8738,
        Neoprene: 98.8738,
        Chemical: 277.9297,
        Cured: 179.0556,
        EPDM: 179.0556,
      },
      Megum: {
        Nitrile: 405.6666,
      },
    },
  },
  pipe: {
    wastePct: RUBBER_PRICING_DEFAULTS.pipe.wastePct,
    markupFactor: RUBBER_PRICING_DEFAULTS.pipe.markupFactor,
    mpsFactor: RUBBER_PRICING_DEFAULTS.pipe.mpsFactor,
    thicknessesMm: [...RUBBER_PRICING_DEFAULTS.pipe.thicknessesMm],
    rubberLining: { department: "Pipes", m2PerHour: 2.78 },
    handling: { department: "Fork", m2PerHour: 10 },
    finishing: { department: "Fork", m2PerHour: 10 },
    solution: { department: "Solution", m2PerHour: 10.4 },
    cwAgentBaselinePerM2: {
      Natural: 200.0437,
      "Premium Natural": 200.0437,
      Butyl: 200.0437,
      Nitrile: 182.7937,
      EPDM: 197.5021,
    },
    cwRecipes: {
      Natural: ["VS86", "VS05", "VS20", "Toluene"],
      "Premium Natural": ["VS86", "VS05", "VS20", "Toluene"],
      Butyl: ["VS86", "VS05", "VS20", "Toluene"],
      Nitrile: ["VS05", "Ty-Ply 2033A", "Toluene"],
      EPDM: ["VS05", "VS54"],
    },
    defaultBondingAgentSupplier: "Ty-Ply",
    cwAgentSupplierBaselines: {
      "Ty-Ply": {
        Natural: 200.0437,
        "Premium Natural": 200.0437,
        Butyl: 200.0437,
        Nitrile: 182.7937,
        EPDM: 197.5021,
      },
      Rema: {
        Natural: 75.0672,
        "Premium Natural": 75.0672,
        Butyl: 75.0672,
      },
      Impilo: {
        Natural: 77.4288,
        "Premium Natural": 77.4288,
        Butyl: 98.8738,
        Nitrile: 98.8738,
        Neoprene: 98.8738,
        EPDM: 179.0556,
      },
      Megum: {
        Nitrile: 411.3276,
      },
    },
    nbFactors: RUBBER_PRICING_DEFAULTS.pipe.nbFactors.map((factor) => ({
      nb: factor.nb,
      pie: factor.pie,
      additional: factor.additional,
    })),
  },
};
