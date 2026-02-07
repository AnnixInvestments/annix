import { ApiProperty } from "@nestjs/swagger";
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";
import { PumpProductCategory, PumpProductStatus } from "../entities/pump-product.entity";

export class CreatePumpProductDto {
  @ApiProperty({ description: "Product SKU/code", example: "PMP-KSB-001" })
  @IsString()
  @MaxLength(50)
  sku: string;

  @ApiProperty({ description: "Product title", example: "KSB Etanorm 50-200" })
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiProperty({ description: "Product description", required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: "Pump type code", example: "centrifugal_end_suction" })
  @IsString()
  @MaxLength(100)
  pumpType: string;

  @ApiProperty({ description: "Pump category", enum: PumpProductCategory })
  @IsEnum(PumpProductCategory)
  category: PumpProductCategory;

  @ApiProperty({ description: "Product status", enum: PumpProductStatus, required: false })
  @IsOptional()
  @IsEnum(PumpProductStatus)
  status?: PumpProductStatus;

  @ApiProperty({ description: "Manufacturer name", example: "KSB" })
  @IsString()
  @MaxLength(100)
  manufacturer: string;

  @ApiProperty({ description: "Manufacturer model/part number", required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  modelNumber?: string;

  @ApiProperty({ description: "API 610 pump type classification", required: false })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  api610Type?: string;

  @ApiProperty({ description: "Minimum flow rate in m³/h", required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  flowRateMin?: number;

  @ApiProperty({ description: "Maximum flow rate in m³/h", required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  flowRateMax?: number;

  @ApiProperty({ description: "Minimum head in meters", required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  headMin?: number;

  @ApiProperty({ description: "Maximum head in meters", required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  headMax?: number;

  @ApiProperty({ description: "Maximum operating temperature in Celsius", required: false })
  @IsOptional()
  @IsNumber()
  maxTemperature?: number;

  @ApiProperty({ description: "Maximum operating pressure in bar", required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxPressure?: number;

  @ApiProperty({ description: "Suction size DN", required: false })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  suctionSize?: string;

  @ApiProperty({ description: "Discharge size DN", required: false })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  dischargeSize?: string;

  @ApiProperty({ description: "Default casing material", required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  casingMaterial?: string;

  @ApiProperty({ description: "Default impeller material", required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  impellerMaterial?: string;

  @ApiProperty({ description: "Default shaft material", required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  shaftMaterial?: string;

  @ApiProperty({ description: "Default seal type", required: false })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  sealType?: string;

  @ApiProperty({ description: "Motor power in kW", required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  motorPowerKw?: number;

  @ApiProperty({ description: "Default voltage", required: false })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  voltage?: string;

  @ApiProperty({ description: "Default frequency", required: false })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  frequency?: string;

  @ApiProperty({ description: "Weight in kg", required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  weightKg?: number;

  @ApiProperty({ description: "Certifications", required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  certifications?: string[];

  @ApiProperty({ description: "Suitable applications", required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  applications?: string[];

  @ApiProperty({ description: "Base cost from supplier in ZAR", required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  baseCost?: number;

  @ApiProperty({ description: "List price in ZAR", required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  listPrice?: number;

  @ApiProperty({ description: "Default markup percentage", required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  markupPercentage?: number;

  @ApiProperty({ description: "Lead time in days", required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  leadTimeDays?: number;

  @ApiProperty({ description: "Stock quantity", required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  stockQuantity?: number;

  @ApiProperty({ description: "Datasheet URL", required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  datasheetUrl?: string;

  @ApiProperty({ description: "Image URL", required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  imageUrl?: string;

  @ApiProperty({ description: "Technical specifications as JSON", required: false })
  @IsOptional()
  specifications?: Record<string, any>;

  @ApiProperty({ description: "Pump curve data as JSON", required: false })
  @IsOptional()
  pumpCurveData?: Record<string, any>;

  @ApiProperty({ description: "Notes", required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ description: "Supplier ID", required: false })
  @IsOptional()
  @IsInt()
  supplierId?: number;
}
