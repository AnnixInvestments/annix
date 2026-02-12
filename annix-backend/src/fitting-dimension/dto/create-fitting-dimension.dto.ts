import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateFittingDimensionDto {
//   @ApiProperty({ example: 1, description: 'Fitting ID' })
//   @IsNumber()
//   @IsNotEmpty()
//   fittingId: number;

  @ApiProperty({ example: 'C', description: 'Dimension name (e.g. A, B, C)' })
  @IsString()
  @IsNotEmpty()
  dimensionName: string;

  @ApiProperty({ example: 120, description: 'Dimension value in millimetres' })
  @IsNumber()
  @IsNotEmpty()
  dimensionValueMm: number;

  @ApiProperty({ example: 1, description: 'Angle range ID (nullable)', required: false })
  @IsNumber()
  @IsOptional()
  angleRangeId?: number;

  @ApiProperty({ example: 1, description: 'FittingVariant ID' })
  @IsNumber()
  @IsNotEmpty()
  variantId: number;
}
