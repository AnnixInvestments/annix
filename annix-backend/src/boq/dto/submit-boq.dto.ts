import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsEmail,
  IsArray,
  ValidateNested,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IsZAPhone } from '../../shared/validators';

// Consolidated item from frontend
export class ConsolidatedItemDto {
  @ApiProperty({ description: 'Item description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Quantity' })
  @IsNumber()
  qty: number;

  @ApiProperty({ description: 'Unit of measure', example: 'Each' })
  @IsString()
  unit: string;

  @ApiProperty({ description: 'Weight in kg' })
  @IsNumber()
  weightKg: number;

  @ApiProperty({ description: 'Entry line numbers this item came from' })
  @IsArray()
  @IsNumber({}, { each: true })
  entries: number[];

  @ApiPropertyOptional({ description: 'Weld data' })
  @IsOptional()
  welds?: {
    pipeWeld?: number;
    flangeWeld?: number;
    mitreWeld?: number;
    teeWeld?: number;
  };

  @ApiPropertyOptional({ description: 'Surface area data' })
  @IsOptional()
  areas?: {
    intAreaM2?: number;
    extAreaM2?: number;
  };
}

export class CustomerInfoDto {
  @ApiProperty({ description: 'Customer name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Customer email' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ description: 'Customer phone' })
  @IsOptional()
  @IsString()
  @IsZAPhone()
  phone?: string;

  @ApiPropertyOptional({ description: 'Customer company' })
  @IsOptional()
  @IsString()
  company?: string;
}

export class ProjectInfoDto {
  @ApiProperty({ description: 'Project name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Project description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Required delivery date' })
  @IsOptional()
  @IsString()
  requiredDate?: string;
}

export class ConsolidatedBoqDataDto {
  @ApiPropertyOptional({ type: [ConsolidatedItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConsolidatedItemDto)
  straightPipes?: ConsolidatedItemDto[];

  @ApiPropertyOptional({ type: [ConsolidatedItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConsolidatedItemDto)
  bends?: ConsolidatedItemDto[];

  @ApiPropertyOptional({ type: [ConsolidatedItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConsolidatedItemDto)
  tees?: ConsolidatedItemDto[];

  @ApiPropertyOptional({ type: [ConsolidatedItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConsolidatedItemDto)
  reducers?: ConsolidatedItemDto[];

  @ApiPropertyOptional({ type: [ConsolidatedItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConsolidatedItemDto)
  flanges?: ConsolidatedItemDto[];

  @ApiPropertyOptional({ type: [ConsolidatedItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConsolidatedItemDto)
  blankFlanges?: ConsolidatedItemDto[];

  @ApiPropertyOptional({ type: [ConsolidatedItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConsolidatedItemDto)
  bnwSets?: ConsolidatedItemDto[];

  @ApiPropertyOptional({ type: [ConsolidatedItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConsolidatedItemDto)
  gaskets?: ConsolidatedItemDto[];

  @ApiPropertyOptional({ type: [ConsolidatedItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConsolidatedItemDto)
  surfaceProtection?: ConsolidatedItemDto[];

  @ApiPropertyOptional({ type: [ConsolidatedItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConsolidatedItemDto)
  hdpePipes?: ConsolidatedItemDto[];

  @ApiPropertyOptional({ type: [ConsolidatedItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConsolidatedItemDto)
  pvcPipes?: ConsolidatedItemDto[];

  @ApiPropertyOptional({ type: [ConsolidatedItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConsolidatedItemDto)
  structuralSteel?: ConsolidatedItemDto[];

  @ApiPropertyOptional({ type: [ConsolidatedItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConsolidatedItemDto)
  valves?: ConsolidatedItemDto[];

  @ApiPropertyOptional({ type: [ConsolidatedItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConsolidatedItemDto)
  instruments?: ConsolidatedItemDto[];

  @ApiPropertyOptional({ type: [ConsolidatedItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConsolidatedItemDto)
  actuators?: ConsolidatedItemDto[];

  @ApiPropertyOptional({ type: [ConsolidatedItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConsolidatedItemDto)
  flowMeters?: ConsolidatedItemDto[];

  @ApiPropertyOptional({ type: [ConsolidatedItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConsolidatedItemDto)
  pressureInstruments?: ConsolidatedItemDto[];

  @ApiPropertyOptional({ type: [ConsolidatedItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConsolidatedItemDto)
  levelInstruments?: ConsolidatedItemDto[];

  @ApiPropertyOptional({ type: [ConsolidatedItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConsolidatedItemDto)
  temperatureInstruments?: ConsolidatedItemDto[];

  @ApiPropertyOptional({ type: [ConsolidatedItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConsolidatedItemDto)
  pumps?: ConsolidatedItemDto[];

  @ApiPropertyOptional({ type: [ConsolidatedItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConsolidatedItemDto)
  pumpParts?: ConsolidatedItemDto[];

  @ApiPropertyOptional({ type: [ConsolidatedItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConsolidatedItemDto)
  pumpSpares?: ConsolidatedItemDto[];

  @ApiPropertyOptional({ type: [ConsolidatedItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConsolidatedItemDto)
  pumpRepairs?: ConsolidatedItemDto[];

  @ApiPropertyOptional({ type: [ConsolidatedItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConsolidatedItemDto)
  pumpRental?: ConsolidatedItemDto[];
}

export class SubmitBoqDto {
  @ApiProperty({ description: 'Consolidated BOQ data' })
  @ValidateNested()
  @Type(() => ConsolidatedBoqDataDto)
  boqData: ConsolidatedBoqDataDto;

  @ApiPropertyOptional({ description: 'Customer information' })
  @IsOptional()
  @ValidateNested()
  @Type(() => CustomerInfoDto)
  customerInfo?: CustomerInfoDto;

  @ApiPropertyOptional({ description: 'Project information' })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProjectInfoDto)
  projectInfo?: ProjectInfoDto;
}

// Response DTO
export class SubmitBoqResponseDto {
  @ApiProperty({ description: 'BOQ ID' })
  boqId: number;

  @ApiProperty({ description: 'BOQ Number' })
  boqNumber: string;

  @ApiProperty({ description: 'Number of sections created' })
  sectionsCreated: number;

  @ApiProperty({ description: 'Number of suppliers notified' })
  suppliersNotified: number;

  @ApiProperty({
    description: 'Summary of sections',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        sectionType: { type: 'string' },
        sectionTitle: { type: 'string' },
        itemCount: { type: 'number' },
        totalWeightKg: { type: 'number' },
      },
    },
  })
  sectionsSummary: {
    sectionType: string;
    sectionTitle: string;
    itemCount: number;
    totalWeightKg: number;
  }[];
}
