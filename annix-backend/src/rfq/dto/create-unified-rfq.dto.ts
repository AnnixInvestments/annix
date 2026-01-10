import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsArray,
  ValidateNested,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateRfqDto } from './create-rfq.dto';

export class UnifiedStraightPipeDto {
  @ApiProperty({ description: 'Nominal bore in mm', example: 500 })
  @IsNumber()
  nominalBoreMm: number;

  @ApiProperty({ description: 'Schedule type', example: 'schedule' })
  @IsString()
  scheduleType: string;

  @ApiProperty({ description: 'Schedule number', example: 'WT6' })
  @IsString()
  scheduleNumber: string;

  @ApiProperty({ description: 'Wall thickness in mm', required: false })
  @IsOptional()
  @IsNumber()
  wallThicknessMm?: number;

  @ApiProperty({ description: 'Pipe end configuration', example: 'FOE_LF' })
  @IsString()
  pipeEndConfiguration: string;

  @ApiProperty({ description: 'Individual pipe length', example: 12.192 })
  @IsNumber()
  individualPipeLength: number;

  @ApiProperty({ description: 'Length unit', example: 'meters' })
  @IsString()
  lengthUnit: string;

  @ApiProperty({ description: 'Quantity type', example: 'number_of_pipes' })
  @IsString()
  quantityType: string;

  @ApiProperty({ description: 'Quantity value', example: 1 })
  @IsNumber()
  quantityValue: number;

  @ApiProperty({ description: 'Working pressure in bar', required: false })
  @IsOptional()
  @IsNumber()
  workingPressureBar?: number;

  @ApiProperty({
    description: 'Working temperature in Celsius',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  workingTemperatureC?: number;

  @ApiProperty({ description: 'Steel specification ID', required: false })
  @IsOptional()
  @IsNumber()
  steelSpecificationId?: number;

  @ApiProperty({ description: 'Flange standard ID', required: false })
  @IsOptional()
  @IsNumber()
  flangeStandardId?: number;

  @ApiProperty({ description: 'Flange pressure class ID', required: false })
  @IsOptional()
  @IsNumber()
  flangePressureClassId?: number;
}

export class UnifiedBendDto {
  @ApiProperty({ description: 'Nominal bore in mm', example: 500 })
  @IsNumber()
  nominalBoreMm: number;

  @ApiProperty({ description: 'Schedule number', example: 'WT6' })
  @IsString()
  scheduleNumber: string;

  @ApiProperty({ description: 'Wall thickness in mm', required: false })
  @IsOptional()
  @IsNumber()
  wallThicknessMm?: number;

  @ApiProperty({ description: 'Bend type (1D, 3D, 5D)', example: '3D' })
  @IsString()
  bendType: string;

  @ApiProperty({ description: 'Bend degrees', example: 90 })
  @IsNumber()
  bendDegrees: number;

  @ApiProperty({ description: 'Bend end configuration', example: 'LF_BE', required: false })
  @IsOptional()
  @IsString()
  bendEndConfiguration?: string;

  @ApiProperty({ description: 'Number of tangents', example: 1 })
  @IsNumber()
  numberOfTangents: number;

  @ApiProperty({ description: 'Tangent lengths in mm', example: [1500] })
  @IsArray()
  tangentLengths: number[];

  @ApiProperty({ description: 'Quantity type', example: 'number_of_items' })
  @IsString()
  quantityType: string;

  @ApiProperty({ description: 'Quantity value', example: 1 })
  @IsNumber()
  quantityValue: number;

  @ApiProperty({ description: 'Working pressure in bar', required: false })
  @IsOptional()
  @IsNumber()
  workingPressureBar?: number;

  @ApiProperty({
    description: 'Working temperature in Celsius',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  workingTemperatureC?: number;

  @ApiProperty({ description: 'Steel specification ID', required: false })
  @IsOptional()
  @IsNumber()
  steelSpecificationId?: number;

  @ApiProperty({ description: 'Use global flange specs', example: true })
  @IsOptional()
  @IsBoolean()
  useGlobalFlangeSpecs?: boolean;

  @ApiProperty({ description: 'Flange standard ID', required: false })
  @IsOptional()
  @IsNumber()
  flangeStandardId?: number;

  @ApiProperty({ description: 'Flange pressure class ID', required: false })
  @IsOptional()
  @IsNumber()
  flangePressureClassId?: number;
}

export class UnifiedFittingDto {
  @ApiProperty({ description: 'Nominal diameter in mm', example: 500 })
  @IsNumber()
  nominalDiameterMm: number;

  @ApiProperty({ description: 'Schedule number', example: 'WT6' })
  @IsString()
  scheduleNumber: string;

  @ApiProperty({ description: 'Wall thickness in mm', required: false })
  @IsOptional()
  @IsNumber()
  wallThicknessMm?: number;

  @ApiProperty({ description: 'Fitting type', example: 'SHORT_TEE' })
  @IsString()
  fittingType: string;

  @ApiProperty({ description: 'Fitting standard', example: 'SABS719' })
  @IsOptional()
  @IsString()
  fittingStandard?: string;

  @ApiProperty({ description: 'Pipe length A in mm', required: false })
  @IsOptional()
  @IsNumber()
  pipeLengthAMm?: number;

  @ApiProperty({ description: 'Pipe length B in mm', required: false })
  @IsOptional()
  @IsNumber()
  pipeLengthBMm?: number;

  @ApiProperty({ description: 'Pipe end configuration', required: false })
  @IsOptional()
  @IsString()
  pipeEndConfiguration?: string;

  @ApiProperty({ description: 'Add blank flange', example: true })
  @IsOptional()
  @IsBoolean()
  addBlankFlange?: boolean;

  @ApiProperty({ description: 'Blank flange count', required: false })
  @IsOptional()
  @IsNumber()
  blankFlangeCount?: number;

  @ApiProperty({ description: 'Blank flange positions', required: false })
  @IsOptional()
  @IsArray()
  blankFlangePositions?: string[];

  @ApiProperty({ description: 'Quantity type', example: 'number_of_items' })
  @IsOptional()
  @IsString()
  quantityType?: string;

  @ApiProperty({ description: 'Quantity value', example: 1 })
  @IsOptional()
  @IsNumber()
  quantityValue?: number;

  @ApiProperty({ description: 'Working pressure in bar', required: false })
  @IsOptional()
  @IsNumber()
  workingPressureBar?: number;

  @ApiProperty({
    description: 'Working temperature in Celsius',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  workingTemperatureC?: number;

  @ApiProperty({
    description: 'Calculation data from frontend',
    required: false,
  })
  @IsOptional()
  calculationData?: Record<string, any>;
}

export class UnifiedRfqItemDto {
  @ApiProperty({ description: 'Item type', example: 'straight_pipe' })
  @IsString()
  itemType: 'straight_pipe' | 'bend' | 'fitting';

  @ApiProperty({ description: 'Item description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Item notes', required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({
    description: 'Total weight from calculation',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  totalWeightKg?: number;

  @ApiProperty({
    description: 'Straight pipe specs (if itemType is straight_pipe)',
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UnifiedStraightPipeDto)
  straightPipe?: UnifiedStraightPipeDto;

  @ApiProperty({
    description: 'Bend specs (if itemType is bend)',
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UnifiedBendDto)
  bend?: UnifiedBendDto;

  @ApiProperty({
    description: 'Fitting specs (if itemType is fitting)',
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UnifiedFittingDto)
  fitting?: UnifiedFittingDto;
}

export class CreateUnifiedRfqDto {
  @ApiProperty({ description: 'RFQ details' })
  @ValidateNested()
  @Type(() => CreateRfqDto)
  rfq: CreateRfqDto;

  @ApiProperty({
    description: 'Array of all RFQ items',
    type: [UnifiedRfqItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UnifiedRfqItemDto)
  items: UnifiedRfqItemDto[];
}
