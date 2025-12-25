import { IsInt, IsNumber, IsPositive, Min, IsOptional } from 'class-validator';

export class CalculatePipeCostDto {
  @IsInt()
  @IsPositive()
  nominalBore: number; // DN in mm (20, 25, 32, ..., 1200)

  @IsNumber()
  @IsPositive()
  sdr: number; // Standard Dimension Ratio

  @IsNumber()
  @IsPositive()
  @Min(0.1)
  length: number; // Length in meters

  @IsNumber()
  @Min(0)
  pricePerKg: number; // Price per kg (supplier input)

  @IsNumber()
  @Min(0)
  @IsOptional()
  buttweldPrice?: number; // Optional override for buttweld price
}
