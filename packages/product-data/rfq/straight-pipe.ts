export interface CreateStraightPipeRfqDto {
  nominalBoreMm: number;
  scheduleType: "schedule" | "wall_thickness";
  scheduleNumber?: string;
  wallThicknessMm?: number;
  pipeEndConfiguration?: "FBE" | "FOE" | "PE" | "FOE_LF" | "FOE_RF" | "2X_RF";
  individualPipeLength: number;
  lengthUnit: "meters" | "feet";
  quantityType: "total_length" | "number_of_pipes";
  quantityValue: number;
  workingPressureBar: number;
  workingTemperatureC?: number;
  steelSpecificationId?: number;
  flangeStandardId?: number;
  flangePressureClassId?: number;
  flangeTypeCode?: string;
  pslLevel?: "PSL1" | "PSL2" | null;
  cvnTestTemperatureC?: number;
  cvnAverageJoules?: number;
  cvnMinimumJoules?: number;
  heatNumber?: string;
  mtcReference?: string;
  ndtCoveragePct?: number;
  lotNumber?: string;
  naceCompliant?: boolean;
  h2sZone?: 1 | 2 | 3 | null;
  maxHardnessHrc?: number;
  sscTested?: boolean;
}

export interface StraightPipeCalculationResult {
  outsideDiameterMm: number;
  wallThicknessMm: number;
  pipeWeightPerMeter: number;
  totalPipeWeight: number;
  totalFlangeWeight: number;
  totalBoltWeight: number;
  totalNutWeight: number;
  totalSystemWeight: number;
  calculatedPipeCount: number;
  calculatedTotalLength: number;
  numberOfFlanges: number;
  numberOfButtWelds: number;
  totalButtWeldLength: number;
  numberOfFlangeWelds: number;
  totalFlangeWeldLength: number;
}
