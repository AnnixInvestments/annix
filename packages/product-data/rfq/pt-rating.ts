export interface PtValidationResult {
  isValid: boolean;
  maxPressureAtTemp: number | null;
  warningMessage: string | null;
}

export interface ValidPressureClassInfo {
  id: number;
  designation: string;
  maxPressureAtTemp: number;
  isAdequate: boolean;
}

export interface PtRecommendationResult {
  validation: PtValidationResult;
  recommendedPressureClassId: number | null;
  validPressureClasses: ValidPressureClassInfo[];
}
