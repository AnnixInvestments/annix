import { IsString, IsNumber, IsOptional, IsPositive, Min, IsArray, IsBoolean, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CalculateSteelWeightDto {
  @ApiProperty({ description: 'Section ID', example: 1 })
  @IsNumber()
  sectionId: number;

  @ApiProperty({ description: 'Length in meters', example: 6.0 })
  @IsNumber()
  @IsPositive()
  lengthM: number;

  @ApiProperty({ description: 'Quantity', example: 10 })
  @IsNumber()
  @IsPositive()
  @Min(1)
  quantity: number;

  @ApiProperty({ description: 'Grade code (optional)', example: 'A36', required: false })
  @IsOptional()
  @IsString()
  gradeCode?: string;
}

export class CalculatePlateDto {
  @ApiProperty({ description: 'Thickness in mm', example: 10 })
  @IsNumber()
  @IsPositive()
  thicknessMm: number;

  @ApiProperty({ description: 'Width in mm', example: 1500 })
  @IsNumber()
  @IsPositive()
  widthMm: number;

  @ApiProperty({ description: 'Length in mm', example: 6000 })
  @IsNumber()
  @IsPositive()
  lengthMm: number;

  @ApiProperty({ description: 'Quantity', example: 5 })
  @IsNumber()
  @IsPositive()
  @Min(1)
  quantity: number;

  @ApiProperty({ description: 'Grade code (optional)', example: 'A36', required: false })
  @IsOptional()
  @IsString()
  gradeCode?: string;
}

export class CalculateFlatBarDto {
  @ApiProperty({ description: 'Width in mm', example: 50 })
  @IsNumber()
  @IsPositive()
  widthMm: number;

  @ApiProperty({ description: 'Thickness in mm', example: 6 })
  @IsNumber()
  @IsPositive()
  thicknessMm: number;

  @ApiProperty({ description: 'Length in meters', example: 6.0 })
  @IsNumber()
  @IsPositive()
  lengthM: number;

  @ApiProperty({ description: 'Quantity', example: 20 })
  @IsNumber()
  @IsPositive()
  @Min(1)
  quantity: number;

  @ApiProperty({ description: 'Grade code (optional)', example: 'A36', required: false })
  @IsOptional()
  @IsString()
  gradeCode?: string;
}

export class CalculateRoundBarDto {
  @ApiProperty({ description: 'Diameter in mm', example: 25 })
  @IsNumber()
  @IsPositive()
  diameterMm: number;

  @ApiProperty({ description: 'Length in meters', example: 6.0 })
  @IsNumber()
  @IsPositive()
  lengthM: number;

  @ApiProperty({ description: 'Quantity', example: 50 })
  @IsNumber()
  @IsPositive()
  @Min(1)
  quantity: number;

  @ApiProperty({ description: 'Grade code (optional)', example: 'A36', required: false })
  @IsOptional()
  @IsString()
  gradeCode?: string;
}

export class CalculateSquareBarDto {
  @ApiProperty({ description: 'Side dimension in mm', example: 20 })
  @IsNumber()
  @IsPositive()
  sideMm: number;

  @ApiProperty({ description: 'Length in meters', example: 6.0 })
  @IsNumber()
  @IsPositive()
  lengthM: number;

  @ApiProperty({ description: 'Quantity', example: 30 })
  @IsNumber()
  @IsPositive()
  @Min(1)
  quantity: number;

  @ApiProperty({ description: 'Grade code (optional)', example: 'A36', required: false })
  @IsOptional()
  @IsString()
  gradeCode?: string;
}

export class SteelCalculationResultDto {
  @ApiProperty({ description: 'Weight per unit length in kg/m' })
  weightKgPerM: number;

  @ApiProperty({ description: 'Surface area per unit length in m²/m' })
  surfaceAreaM2PerM: number;

  @ApiProperty({ description: 'Total weight in kg' })
  totalWeightKg: number;

  @ApiProperty({ description: 'Total surface area in m²' })
  totalSurfaceAreaM2: number;

  @ApiProperty({ description: 'Length in meters' })
  lengthM: number;

  @ApiProperty({ description: 'Quantity' })
  quantity: number;

  @ApiProperty({ description: 'Section designation (if applicable)', required: false })
  designation?: string;

  @ApiProperty({ description: 'Steel type name', required: false })
  typeName?: string;

  @ApiProperty({ description: 'Grade code', required: false })
  gradeCode?: string;

  @ApiProperty({ description: 'Dimensions used', required: false })
  dimensions?: Record<string, number>;
}

// ==================== Fabrication DTOs ====================

export class FabricationOperationItemDto {
  @ApiProperty({ description: 'Operation code', example: 'drilling' })
  @IsString()
  operationCode: string;

  @ApiProperty({ description: 'Quantity of operations', example: 50 })
  @IsNumber()
  @IsPositive()
  quantity: number;
}

export class CalculateFabricationCostDto {
  @ApiProperty({ description: 'Total weight in kg', example: 1500 })
  @IsNumber()
  @IsPositive()
  totalWeightKg: number;

  @ApiProperty({ description: 'Complexity level', example: 'medium', enum: ['simple', 'medium', 'complex'] })
  @IsString()
  complexityLevel: string;

  @ApiProperty({ description: 'Is stainless steel', example: false })
  @IsBoolean()
  @IsOptional()
  isStainless?: boolean;

  @ApiProperty({ description: 'Shop labor rate code', example: 'carbon_steel' })
  @IsString()
  @IsOptional()
  laborRateCode?: string;

  @ApiProperty({ description: 'List of fabrication operations', type: [FabricationOperationItemDto], required: false })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FabricationOperationItemDto)
  @IsOptional()
  operations?: FabricationOperationItemDto[];
}

export class FabricationCostBreakdownDto {
  @ApiProperty({ description: 'Operation code' })
  operationCode: string;

  @ApiProperty({ description: 'Operation name' })
  operationName: string;

  @ApiProperty({ description: 'Quantity' })
  quantity: number;

  @ApiProperty({ description: 'Hours per unit' })
  hoursPerUnit: number;

  @ApiProperty({ description: 'Total hours for operation' })
  totalHours: number;

  @ApiProperty({ description: 'Cost for this operation' })
  cost: number;
}

export class FabricationCostResultDto {
  @ApiProperty({ description: 'Total weight in kg' })
  totalWeightKg: number;

  @ApiProperty({ description: 'Weight in tons' })
  weightTons: number;

  @ApiProperty({ description: 'Complexity level' })
  complexityLevel: string;

  @ApiProperty({ description: 'Hours per ton for complexity level' })
  hoursPerTon: number;

  @ApiProperty({ description: 'Base fabrication hours (complexity-based)' })
  baseFabricationHours: number;

  @ApiProperty({ description: 'Additional operation hours', type: [FabricationCostBreakdownDto] })
  operationBreakdown: FabricationCostBreakdownDto[];

  @ApiProperty({ description: 'Total additional operation hours' })
  totalOperationHours: number;

  @ApiProperty({ description: 'Total labor hours' })
  totalLaborHours: number;

  @ApiProperty({ description: 'Labor rate per hour' })
  laborRatePerHour: number;

  @ApiProperty({ description: 'Stainless steel multiplier applied' })
  stainlessMultiplier: number;

  @ApiProperty({ description: 'Total fabrication cost' })
  totalFabricationCost: number;

  @ApiProperty({ description: 'Currency' })
  currency: string;
}

export class UpdateLaborRateDto {
  @ApiProperty({ description: 'New rate per hour', example: 450.00 })
  @IsNumber()
  @IsPositive()
  ratePerHour: number;

  @ApiProperty({ description: 'Currency (default ZAR)', example: 'ZAR', required: false })
  @IsString()
  @IsOptional()
  currency?: string;
}
