import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export enum PipeSteelWorkTypeDto {
  PIPE_SUPPORT = 'pipe_support',
  REINFORCEMENT_PAD = 'reinforcement_pad',
  SADDLE_SUPPORT = 'saddle_support',
  SHOE_SUPPORT = 'shoe_support',
}

export enum BracketTypeDto {
  CLEVIS_HANGER = 'clevis_hanger',
  THREE_BOLT_CLAMP = 'three_bolt_clamp',
  WELDED_BRACKET = 'welded_bracket',
  PIPE_SADDLE = 'pipe_saddle',
  U_BOLT = 'u_bolt',
  BAND_HANGER = 'band_hanger',
  ROLLER_SUPPORT = 'roller_support',
  SLIDE_PLATE = 'slide_plate',
}

export class CalculateSupportSpacingDto {
  @ApiProperty({ description: 'Nominal diameter in mm', example: 200 })
  @IsNumber()
  @Min(15)
  nominalDiameterMm: number;

  @ApiPropertyOptional({ description: 'Schedule number', example: 'Std' })
  @IsOptional()
  @IsString()
  scheduleNumber?: string;

  @ApiPropertyOptional({
    description: 'Whether pipe is water-filled',
    example: true,
  })
  @IsOptional()
  isWaterFilled?: boolean;
}

export class CalculateReinforcementPadDto {
  @ApiProperty({ description: 'Header pipe OD in mm', example: 323.9 })
  @IsNumber()
  @Min(20)
  headerOdMm: number;

  @ApiProperty({ description: 'Header pipe wall thickness in mm', example: 9.53 })
  @IsNumber()
  @Min(1)
  headerWallMm: number;

  @ApiProperty({ description: 'Branch pipe OD in mm', example: 168.3 })
  @IsNumber()
  @Min(20)
  branchOdMm: number;

  @ApiProperty({ description: 'Branch pipe wall thickness in mm', example: 7.11 })
  @IsNumber()
  @Min(1)
  branchWallMm: number;

  @ApiPropertyOptional({
    description: 'Working pressure in bar',
    example: 10,
  })
  @IsOptional()
  @IsNumber()
  workingPressureBar?: number;

  @ApiPropertyOptional({
    description: 'Material allowable stress in MPa',
    example: 138,
  })
  @IsOptional()
  @IsNumber()
  allowableStressMpa?: number;
}

export class CalculateNumberOfSupportsDto {
  @ApiProperty({ description: 'Pipeline length in meters', example: 100 })
  @IsNumber()
  @Min(0)
  pipelineLengthM: number;

  @ApiProperty({ description: 'Support spacing in meters', example: 3.0 })
  @IsNumber()
  @Min(0.1)
  supportSpacingM: number;
}

export class SupportSpacingResponseDto {
  @ApiProperty({ description: 'Nominal diameter in mm' })
  nominalDiameterMm: number;

  @ApiProperty({ description: 'Recommended support spacing for water-filled pipe (m)' })
  waterFilledSpacingM: number;

  @ApiProperty({ description: 'Recommended support spacing for vapor/gas pipe (m)' })
  vaporGasSpacingM: number;

  @ApiProperty({ description: 'Recommended rod size in mm' })
  rodSizeMm?: number;

  @ApiProperty({ description: 'Data source standard' })
  standard: string;
}

export class ReinforcementPadResponseDto {
  @ApiProperty({ description: 'Required reinforcement area (mm2)' })
  requiredAreaMm2: number;

  @ApiProperty({ description: 'Recommended pad outer diameter (mm)' })
  padOuterDiameterMm: number;

  @ApiProperty({ description: 'Recommended pad thickness (mm)' })
  padThicknessMm: number;

  @ApiProperty({ description: 'Pad weight (kg)' })
  padWeightKg: number;

  @ApiProperty({ description: 'Whether reinforcement is required' })
  reinforcementRequired: boolean;

  @ApiProperty({ description: 'Calculation notes' })
  notes: string;
}

export class BracketTypeResponseDto {
  @ApiProperty({ description: 'Bracket type code' })
  typeCode: string;

  @ApiProperty({ description: 'Display name' })
  displayName: string;

  @ApiProperty({ description: 'Description' })
  description?: string;

  @ApiProperty({ description: 'Suitable for the given pipe size' })
  isSuitable: boolean;

  @ApiProperty({ description: 'Base cost per unit (Rand)' })
  baseCostPerUnit?: number;

  @ApiProperty({ description: 'Allows thermal expansion' })
  allowsExpansion: boolean;

  @ApiProperty({ description: 'Is anchor type' })
  isAnchorType: boolean;
}

export class PipeSteelWorkCalculationDto {
  @ApiProperty({
    description: 'Type of calculation',
    enum: PipeSteelWorkTypeDto,
  })
  @IsEnum(PipeSteelWorkTypeDto)
  workType: PipeSteelWorkTypeDto;

  @ApiProperty({ description: 'Nominal diameter in mm', example: 200 })
  @IsNumber()
  nominalDiameterMm: number;

  @ApiPropertyOptional({ description: 'Schedule number' })
  @IsOptional()
  @IsString()
  scheduleNumber?: string;

  @ApiPropertyOptional({ description: 'Bracket type', enum: BracketTypeDto })
  @IsOptional()
  @IsEnum(BracketTypeDto)
  bracketType?: BracketTypeDto;

  @ApiPropertyOptional({ description: 'Pipeline length in meters' })
  @IsOptional()
  @IsNumber()
  pipelineLengthM?: number;

  @ApiPropertyOptional({ description: 'Working pressure in bar' })
  @IsOptional()
  @IsNumber()
  workingPressureBar?: number;

  @ApiPropertyOptional({ description: 'Branch diameter for reinforcement pad (mm)' })
  @IsOptional()
  @IsNumber()
  branchDiameterMm?: number;

  @ApiPropertyOptional({ description: 'Quantity' })
  @IsOptional()
  @IsNumber()
  quantity?: number;
}

export class PipeSteelWorkCalculationResponseDto {
  @ApiProperty({ description: 'Type of work' })
  workType: string;

  @ApiProperty({ description: 'Recommended support spacing (m)' })
  supportSpacingM?: number;

  @ApiProperty({ description: 'Number of supports required' })
  numberOfSupports?: number;

  @ApiProperty({ description: 'Weight per unit (kg)' })
  weightPerUnitKg?: number;

  @ApiProperty({ description: 'Total weight (kg)' })
  totalWeightKg?: number;

  @ApiProperty({ description: 'Unit cost (Rand)' })
  unitCost?: number;

  @ApiProperty({ description: 'Total cost (Rand)' })
  totalCost?: number;

  @ApiProperty({ description: 'Reinforcement pad details' })
  reinforcementPad?: ReinforcementPadResponseDto;

  @ApiProperty({ description: 'Calculation notes' })
  notes?: string;
}
