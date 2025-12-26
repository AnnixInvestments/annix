import { IsInt, IsNumber, IsPositive, Min, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CalculatePvcFittingCostDto {
  @ApiProperty({ description: 'Fitting type code (e.g., elbow_90, tee, coupling)' })
  @IsString()
  fittingTypeCode: string;

  @ApiProperty({ description: 'Nominal diameter in mm (DN)' })
  @IsInt()
  @IsPositive()
  nominalDiameter: number;

  @ApiProperty({ description: 'Price per kg (supplier input)' })
  @IsNumber()
  @Min(0)
  pricePerKg: number;

  @ApiPropertyOptional({ description: 'Pressure rating in bar (PN)' })
  @IsNumber()
  @IsPositive()
  @IsOptional()
  pressureRating?: number;

  @ApiPropertyOptional({ description: 'Optional override for cement joint price' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  cementJointPrice?: number;
}
