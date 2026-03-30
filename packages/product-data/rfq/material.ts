export interface MaterialLimit {
  id: number;
  steelSpecificationId: number | null;
  steelSpecName: string;
  minTemperatureCelsius: number;
  maxTemperatureCelsius: number;
  maxPressureBar: number;
  materialType: string;
  recommendedForSourService: boolean;
  notes: string | null;
}

export interface MaterialSuitabilityResult {
  isSuitable: boolean;
  warnings: string[];
  recommendation?: string;
  limits?: {
    minTempC: number;
    maxTempC: number;
    maxPressureBar: number;
    materialType: string;
    notes?: string;
  };
}
