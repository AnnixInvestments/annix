import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsBoolean,
  IsArray,
} from 'class-validator';
import {
  PumpCategory,
  PumpServiceType,
  PumpMotorType,
  PumpSealType,
} from '../entities/pump-rfq.entity';

export class CreatePumpRfqDto {
  @ApiProperty({
    description: 'Service type',
    enum: PumpServiceType,
    default: PumpServiceType.NEW_PUMP,
  })
  @IsOptional()
  @IsEnum(PumpServiceType)
  serviceType?: PumpServiceType;

  @ApiProperty({ description: 'Pump type', example: 'centrifugal_end_suction' })
  @IsString()
  pumpType: string;

  @ApiProperty({
    description: 'Pump category',
    enum: PumpCategory,
    required: false,
  })
  @IsOptional()
  @IsEnum(PumpCategory)
  pumpCategory?: PumpCategory;

  @ApiProperty({ description: 'Flow rate in m³/h', required: false })
  @IsOptional()
  @IsNumber()
  flowRate?: number;

  @ApiProperty({ description: 'Total dynamic head in meters', required: false })
  @IsOptional()
  @IsNumber()
  totalHead?: number;

  @ApiProperty({ description: 'Suction head/lift in meters', required: false })
  @IsOptional()
  @IsNumber()
  suctionHead?: number;

  @ApiProperty({ description: 'NPSHa in meters', required: false })
  @IsOptional()
  @IsNumber()
  npshAvailable?: number;

  @ApiProperty({ description: 'Discharge pressure in bar', required: false })
  @IsOptional()
  @IsNumber()
  dischargePressure?: number;

  @ApiProperty({
    description: 'Operating temperature in Celsius',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  operatingTemp?: number;

  @ApiProperty({ description: 'Fluid type' })
  @IsString()
  fluidType: string;

  @ApiProperty({ description: 'Specific gravity', required: false })
  @IsOptional()
  @IsNumber()
  specificGravity?: number;

  @ApiProperty({ description: 'Viscosity in cP', required: false })
  @IsOptional()
  @IsNumber()
  viscosity?: number;

  @ApiProperty({ description: 'Solids content percentage', required: false })
  @IsOptional()
  @IsNumber()
  solidsContent?: number;

  @ApiProperty({ description: 'Max solids size in mm', required: false })
  @IsOptional()
  @IsNumber()
  solidsSize?: number;

  @ApiProperty({ description: 'pH level', required: false })
  @IsOptional()
  @IsNumber()
  ph?: number;

  @ApiProperty({ description: 'Is fluid abrasive', required: false })
  @IsOptional()
  @IsBoolean()
  isAbrasive?: boolean;

  @ApiProperty({ description: 'Is fluid corrosive', required: false })
  @IsOptional()
  @IsBoolean()
  isCorrosive?: boolean;

  @ApiProperty({ description: 'Casing material' })
  @IsString()
  casingMaterial: string;

  @ApiProperty({ description: 'Impeller material' })
  @IsString()
  impellerMaterial: string;

  @ApiProperty({ description: 'Shaft material', required: false })
  @IsOptional()
  @IsString()
  shaftMaterial?: string;

  @ApiProperty({
    description: 'Seal type',
    enum: PumpSealType,
    required: false,
  })
  @IsOptional()
  @IsEnum(PumpSealType)
  sealType?: PumpSealType;

  @ApiProperty({ description: 'API 682 seal flush plan', required: false })
  @IsOptional()
  @IsString()
  sealPlan?: string;

  @ApiProperty({ description: 'Suction size DN', required: false })
  @IsOptional()
  @IsString()
  suctionSize?: string;

  @ApiProperty({ description: 'Discharge size DN', required: false })
  @IsOptional()
  @IsString()
  dischargeSize?: string;

  @ApiProperty({ description: 'Connection type', required: false })
  @IsOptional()
  @IsString()
  connectionType?: string;

  @ApiProperty({
    description: 'Motor type',
    enum: PumpMotorType,
    default: PumpMotorType.ELECTRIC_AC,
  })
  @IsOptional()
  @IsEnum(PumpMotorType)
  motorType?: PumpMotorType;

  @ApiProperty({ description: 'Motor power in kW', required: false })
  @IsOptional()
  @IsNumber()
  motorPower?: number;

  @ApiProperty({ description: 'Voltage', required: false })
  @IsOptional()
  @IsString()
  voltage?: string;

  @ApiProperty({ description: 'Frequency', required: false })
  @IsOptional()
  @IsString()
  frequency?: string;

  @ApiProperty({ description: 'Motor efficiency class', required: false })
  @IsOptional()
  @IsString()
  motorEfficiency?: string;

  @ApiProperty({ description: 'Motor enclosure type', required: false })
  @IsOptional()
  @IsString()
  enclosure?: string;

  @ApiProperty({ description: 'Hazardous area classification', required: false })
  @IsOptional()
  @IsString()
  hazardousArea?: string;

  @ApiProperty({ description: 'Certifications', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  certifications?: string[];

  @ApiProperty({
    description: 'Spare part category (for spare parts service)',
    required: false,
  })
  @IsOptional()
  @IsString()
  sparePartCategory?: string;

  @ApiProperty({
    description: 'Spare parts list as array (for spare parts service)',
    required: false,
  })
  @IsOptional()
  @IsArray()
  spareParts?: Record<string, any>[];

  @ApiProperty({
    description: 'Existing pump make/model (for parts/repair)',
    required: false,
  })
  @IsOptional()
  @IsString()
  existingPumpModel?: string;

  @ApiProperty({ description: 'Existing pump serial number', required: false })
  @IsOptional()
  @IsString()
  existingPumpSerial?: string;

  @ApiProperty({
    description: 'Rental duration in days (for rental)',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  rentalDurationDays?: number;

  @ApiProperty({ description: 'Quantity', example: 1 })
  @IsOptional()
  @IsNumber()
  quantityValue?: number;

  @ApiProperty({ description: 'Supplier reference', required: false })
  @IsOptional()
  @IsString()
  supplierReference?: string;

  @ApiProperty({ description: 'Unit cost from supplier', required: false })
  @IsOptional()
  @IsNumber()
  unitCostFromSupplier?: number;

  @ApiProperty({ description: 'Markup percentage', required: false })
  @IsOptional()
  @IsNumber()
  markupPercentage?: number;

  @ApiProperty({ description: 'Unit cost', required: false })
  @IsOptional()
  @IsNumber()
  unitCost?: number;

  @ApiProperty({ description: 'Total cost', required: false })
  @IsOptional()
  @IsNumber()
  totalCost?: number;

  @ApiProperty({ description: 'Additional notes', required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ description: 'Calculation data', required: false })
  @IsOptional()
  calculationData?: Record<string, any>;
}

export class PumpRfqResponseDto {
  @ApiProperty({ description: 'Primary key' })
  id: number;

  @ApiProperty({ description: 'Service type' })
  serviceType: PumpServiceType;

  @ApiProperty({ description: 'Pump type' })
  pumpType: string;

  @ApiProperty({ description: 'Pump category' })
  pumpCategory?: PumpCategory;

  @ApiProperty({ description: 'Flow rate' })
  flowRate?: number;

  @ApiProperty({ description: 'Total head' })
  totalHead?: number;

  @ApiProperty({ description: 'Suction head' })
  suctionHead?: number;

  @ApiProperty({ description: 'NPSHa' })
  npshAvailable?: number;

  @ApiProperty({ description: 'Discharge pressure' })
  dischargePressure?: number;

  @ApiProperty({ description: 'Operating temperature' })
  operatingTemp?: number;

  @ApiProperty({ description: 'Fluid type' })
  fluidType: string;

  @ApiProperty({ description: 'Specific gravity' })
  specificGravity?: number;

  @ApiProperty({ description: 'Viscosity' })
  viscosity?: number;

  @ApiProperty({ description: 'Solids content' })
  solidsContent?: number;

  @ApiProperty({ description: 'Solids size' })
  solidsSize?: number;

  @ApiProperty({ description: 'pH' })
  ph?: number;

  @ApiProperty({ description: 'Is abrasive' })
  isAbrasive: boolean;

  @ApiProperty({ description: 'Is corrosive' })
  isCorrosive: boolean;

  @ApiProperty({ description: 'Casing material' })
  casingMaterial: string;

  @ApiProperty({ description: 'Impeller material' })
  impellerMaterial: string;

  @ApiProperty({ description: 'Shaft material' })
  shaftMaterial?: string;

  @ApiProperty({ description: 'Seal type' })
  sealType?: PumpSealType;

  @ApiProperty({ description: 'Seal plan' })
  sealPlan?: string;

  @ApiProperty({ description: 'Suction size' })
  suctionSize?: string;

  @ApiProperty({ description: 'Discharge size' })
  dischargeSize?: string;

  @ApiProperty({ description: 'Connection type' })
  connectionType?: string;

  @ApiProperty({ description: 'Motor type' })
  motorType: PumpMotorType;

  @ApiProperty({ description: 'Motor power' })
  motorPower?: number;

  @ApiProperty({ description: 'Voltage' })
  voltage?: string;

  @ApiProperty({ description: 'Frequency' })
  frequency?: string;

  @ApiProperty({ description: 'Motor efficiency' })
  motorEfficiency?: string;

  @ApiProperty({ description: 'Enclosure' })
  enclosure?: string;

  @ApiProperty({ description: 'Hazardous area' })
  hazardousArea: string;

  @ApiProperty({ description: 'Certifications' })
  certifications: string[];

  @ApiProperty({ description: 'Spare part category' })
  sparePartCategory?: string;

  @ApiProperty({ description: 'Spare parts' })
  spareParts?: Record<string, any>[];

  @ApiProperty({ description: 'Existing pump model' })
  existingPumpModel?: string;

  @ApiProperty({ description: 'Existing pump serial' })
  existingPumpSerial?: string;

  @ApiProperty({ description: 'Rental duration days' })
  rentalDurationDays?: number;

  @ApiProperty({ description: 'Quantity' })
  quantityValue: number;

  @ApiProperty({ description: 'Supplier reference' })
  supplierReference?: string;

  @ApiProperty({ description: 'Unit cost from supplier' })
  unitCostFromSupplier?: number;

  @ApiProperty({ description: 'Markup percentage' })
  markupPercentage: number;

  @ApiProperty({ description: 'Unit cost' })
  unitCost?: number;

  @ApiProperty({ description: 'Total cost' })
  totalCost?: number;

  @ApiProperty({ description: 'Notes' })
  notes?: string;

  @ApiProperty({ description: 'Calculation data' })
  calculationData?: Record<string, any>;

  @ApiProperty({ description: 'Created at' })
  createdAt: Date;

  @ApiProperty({ description: 'Updated at' })
  updatedAt: Date;
}
