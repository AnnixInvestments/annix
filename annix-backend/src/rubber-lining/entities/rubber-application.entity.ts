import { RubberType } from "./rubber-type.entity";

export enum ApplicationEnvironment {
  MINING_SLURRY = "mining_slurry",
  CHEMICAL_PROCESSING = "chemical_processing",
  WATER_TREATMENT = "water_treatment",
  OIL_AND_GAS = "oil_and_gas",
  FOOD_PROCESSING = "food_processing",
  GENERAL_INDUSTRIAL = "general_industrial",
}

export enum ChemicalCategory {
  ACIDS_INORGANIC = "acids_inorganic",
  ACIDS_ORGANIC = "acids_organic",
  ALKALIS = "alkalis",
  ALCOHOLS = "alcohols",
  HYDROCARBONS = "hydrocarbons",
  OILS_MINERAL = "oils_mineral",
  OILS_VEGETABLE = "oils_vegetable",
  CHLORINE_COMPOUNDS = "chlorine_compounds",
  OXIDIZING_AGENTS = "oxidizing_agents",
  SOLVENTS = "solvents",
  WATER = "water",
  SLURRY_ABRASIVE = "slurry_abrasive",
}

export enum ResistanceRating {
  EXCELLENT = "excellent",
  GOOD = "good",
  FAIR = "fair",
  POOR = "poor",
  NOT_RECOMMENDED = "not_recommended",
}

export class RubberApplicationRating {
  id: number;

  rubberTypeId: number;

  rubberType: RubberType;

  chemicalCategory: string;

  resistanceRating: string;

  maxTempCelsius: number | null;

  maxConcentrationPercent: number | null;

  notes: string | null;
}

export class RubberThicknessRecommendation {
  id: number;

  nominalThicknessMm: number;

  minPlies: number;

  maxPlyThicknessMm: number;

  applicationNotes: string | null;

  suitableForComplexShapes: boolean;
}

export class RubberAdhesionRequirement {
  id: number;

  rubberTypeId: number;

  rubberType: RubberType;

  vulcanizationMethod: string;

  minAdhesionNPerMm: number;

  testStandard: string;
}
