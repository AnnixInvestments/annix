import { IsInt, IsNumber, IsString, IsPositive, Min, IsOptional } from 'class-validator';

export class CalculateFittingCostDto {
  @IsString()
  fittingTypeCode: string; // e.g., 'molded_90_elbow', 'fab_90_elbow_3seg'

  @IsInt()
  @IsPositive()
  nominalBore: number; // DN in mm

  @IsNumber()
  @Min(0)
  pricePerKg: number; // Price per kg

  @IsNumber()
  @Min(0)
  @IsOptional()
  buttweldPrice?: number; // Optional override

  @IsNumber()
  @Min(0)
  @IsOptional()
  stubPrice?: number; // For stub_end type
}
