export interface CreateBendRfqDto {
  nominalBoreMm: number;
  scheduleNumber: string;
  wallThicknessMm?: number;
  bendType: string;
  bendDegrees: number;
  centerToFaceMm?: number;
  bendRadiusMm?: number;
  numberOfTangents: number;
  tangentLengths: number[];
  quantityValue: number;
  quantityType: "number_of_items";
  workingPressureBar: number;
  workingTemperatureC: number;
  steelSpecificationId: number;
}

export interface BendCalculationResult {
  totalWeight: number;
  centerToFaceDimension: number;
  bendWeight: number;
  tangentWeight: number;
  flangeWeight: number;
  numberOfFlanges: number;
  numberOfFlangeWelds: number;
  totalFlangeWeldLength: number;
  numberOfButtWelds: number;
  totalButtWeldLength: number;
  outsideDiameterMm: number;
  wallThicknessMm: number;
}
