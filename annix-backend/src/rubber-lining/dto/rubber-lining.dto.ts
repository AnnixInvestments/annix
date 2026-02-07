export class RubberTypeDto {
  id: number;
  typeNumber: number;
  typeName: string;
  polymerCodes: string;
  polymerNames: string;
  description: string;
  tempMinCelsius: number;
  tempMaxCelsius: number;
  ozoneResistance: string;
  oilResistance: string;
  chemicalResistanceNotes: string | null;
  notSuitableFor: string | null;
  typicalApplications: string | null;
}

export class RubberSpecificationDto {
  id: number;
  rubberTypeId: number;
  rubberTypeName: string | null;
  grade: string;
  hardnessClassIrhd: number;
  tensileStrengthMpaMin: number;
  elongationAtBreakMin: number;
  tensileAfterAgeingMinPercent: number;
  tensileAfterAgeingMaxPercent: number;
  elongationAfterAgeingMinPercent: number;
  elongationAfterAgeingMaxPercent: number;
  hardnessChangeAfterAgeingMax: number;
  heatResistance80cHardnessChangeMax: number | null;
  heatResistance100cHardnessChangeMax: number | null;
  ozoneResistance: string | null;
  chemicalResistanceHardnessChangeMax: number | null;
  waterResistanceMaxPercent: number | null;
  oilResistanceMaxPercent: number | null;
  contaminantReleaseMaxPercent: number | null;
  sansStandard: string;
}

export class RubberApplicationRatingDto {
  id: number;
  rubberTypeId: number;
  rubberTypeName: string | null;
  chemicalCategory: string;
  resistanceRating: string;
  maxTempCelsius: number | null;
  maxConcentrationPercent: number | null;
  notes: string | null;
}

export class RubberThicknessRecommendationDto {
  id: number;
  nominalThicknessMm: number;
  minPlies: number;
  maxPlyThicknessMm: number;
  applicationNotes: string | null;
  suitableForComplexShapes: boolean;
}

export class RubberAdhesionRequirementDto {
  id: number;
  rubberTypeId: number;
  rubberTypeName: string | null;
  vulcanizationMethod: string;
  minAdhesionNPerMm: number;
  testStandard: string;
}

export class RubberRecommendationRequestDto {
  chemicalExposure?: string[];
  maxTemperatureCelsius?: number;
  minTemperatureCelsius?: number;
  requiresOilResistance?: boolean;
  requiresOzoneResistance?: boolean;
  abrasionLevel?: "low" | "medium" | "high" | "very_high";
  corrosionLevel?: "low" | "medium" | "high" | "very_high";
  applicationEnvironment?: string;
}

export class RubberRecommendationDto {
  recommendedTypes: RubberTypeDto[];
  recommendedSpecifications: RubberSpecificationDto[];
  reasoning: string[];
  warnings: string[];
  sansCompliance: {
    sans1198: boolean;
    sans1201: boolean;
  };
}

export class LineCalloutDto {
  type: number;
  grade: string;
  hardnessClass: number;
  specialProperties: string[];
  fullCallout: string;
  description: string;
}
