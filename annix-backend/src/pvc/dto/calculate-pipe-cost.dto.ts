import { IsInt, IsNumber, IsPositive, Min, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CalculatePvcPipeCostDto {
  @ApiProperty({ description: 'Nominal diameter in mm (DN)' })
  @IsInt()
  @IsPositive()
  nominalDiameter: number; // DN in mm (12, 16, 20, 25, 32, ..., 1000)

  @ApiProperty({ description: 'Pressure rating in bar (PN)' })
  @IsNumber()
  @IsPositive()
  pressureRating: number; // PN rating (6, 8, 10, 12.5, 16, 20, 25)

  @ApiProperty({ description: 'Length in meters' })
  @IsNumber()
  @IsPositive()
  @Min(0.1)
  length: number; // Length in meters

  @ApiProperty({ description: 'Price per kg (supplier input)' })
  @IsNumber()
  @Min(0)
  pricePerKg: number;

  @ApiPropertyOptional({ description: 'PVC type (default: PVC-U)' })
  @IsString()
  @IsOptional()
  pvcType?: string; // PVC-U, CPVC, PVC-O, PVC-M

  @ApiPropertyOptional({ description: 'Optional override for cement joint price' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  cementJointPrice?: number;
}
