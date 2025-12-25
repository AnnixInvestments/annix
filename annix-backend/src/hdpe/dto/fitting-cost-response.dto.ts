export class FittingCostResponseDto {
  fittingType: string;
  fittingTypeCode: string;
  nominalBore: number;
  weightKg: number;
  numButtwelds: number;
  isMolded: boolean;
  isFabricated: boolean;
  materialCost: number;
  buttweldCost: number;
  stubCost: number;
  totalCost: number;
  pricePerKg: number;
  buttweldPrice: number;
}
