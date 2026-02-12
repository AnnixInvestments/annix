import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export enum FittingStandard {
  SABS62 = 'SABS62',
  SABS719 = 'SABS719',
}

export enum FittingType {
  // SABS62 Types
  EQUAL_TEE = 'EQUAL_TEE',
  UNEQUAL_TEE = 'UNEQUAL_TEE',
  LATERAL = 'LATERAL',
  SWEEP_TEE = 'SWEEP_TEE',
  UNEQUAL_CROSS = 'UNEQUAL_CROSS',
  Y_PIECE = 'Y_PIECE',
  GUSSETTED_TEE = 'GUSSETTED_TEE',
  EQUAL_CROSS = 'EQUAL_CROSS',
  // SABS719 Types
  ELBOW = 'ELBOW',
  MEDIUM_RADIUS_BEND = 'MEDIUM_RADIUS_BEND',
  LONG_RADIUS_BEND = 'LONG_RADIUS_BEND',
  DUCKFOOT_SHORT = 'DUCKFOOT_SHORT',
  DUCKFOOT_GUSSETTED = 'DUCKFOOT_GUSSETTED',
  SWEEP_LONG_RADIUS = 'SWEEP_LONG_RADIUS',
  SWEEP_MEDIUM_RADIUS = 'SWEEP_MEDIUM_RADIUS',
  SWEEP_ELBOW = 'SWEEP_ELBOW',
  SABS719_LATERAL = 'SABS719_LATERAL',
  // Additional types
  CON_REDUCER = 'CON_REDUCER',
  ECCENTRIC_REDUCER = 'ECCENTRIC_REDUCER',
}

export class GetFittingDimensionsDto {
  @ApiProperty({
    enum: FittingStandard,
    description: 'Fitting standard (SABS62 or SABS719)',
    example: FittingStandard.SABS62,
  })
  @IsEnum(FittingStandard)
  standard: FittingStandard;

  @ApiProperty({
    enum: FittingType,
    description: 'Type of fitting',
    example: FittingType.EQUAL_TEE,
  })
  @IsEnum(FittingType)
  fittingType: FittingType;

  @ApiProperty({
    description: 'Nominal diameter in mm',
    example: 100,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  nominalDiameterMm: number;

  @ApiPropertyOptional({
    description: 'Angle range for laterals and Y-pieces (e.g., "60-90", "45-59", "30-44")',
    example: '60-90',
  })
  @IsOptional()
  @IsString()
  angleRange?: string;
}
