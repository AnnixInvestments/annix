import { ApiProperty } from "@nestjs/swagger";
import { SupplierProfile } from "../../supplier/entities/supplier-profile.entity";

export enum PumpProductStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  DISCONTINUED = "discontinued",
}

export enum PumpProductCategory {
  CENTRIFUGAL = "centrifugal",
  POSITIVE_DISPLACEMENT = "positive_displacement",
  SPECIALTY = "specialty",
}

export class PumpProduct {
  @ApiProperty({ description: "Primary key", example: 1 })
  id: number;

  @ApiProperty({ description: "Product SKU/code", example: "PMP-KSB-001" })
  sku: string;

  @ApiProperty({ description: "Product title", example: "KSB Etanorm 50-200" })
  title: string;

  @ApiProperty({ description: "Product description" })
  description: string | null;

  @ApiProperty({
    description: "Pump type code",
    example: "centrifugal_end_suction",
  })
  pumpType: string;

  @ApiProperty({ description: "Pump category", enum: PumpProductCategory })
  category: PumpProductCategory;

  @ApiProperty({ description: "Product status", enum: PumpProductStatus })
  status: PumpProductStatus;

  @ApiProperty({ description: "Manufacturer name", example: "KSB" })
  manufacturer: string;

  @ApiProperty({ description: "Manufacturer model/part number" })
  modelNumber: string | null;

  @ApiProperty({ description: "API 610 pump type classification" })
  api610Type: string | null;

  @ApiProperty({ description: "Minimum flow rate in m³/h" })
  flowRateMin: number | null;

  @ApiProperty({ description: "Maximum flow rate in m³/h" })
  flowRateMax: number | null;

  @ApiProperty({ description: "Minimum head in meters" })
  headMin: number | null;

  @ApiProperty({ description: "Maximum head in meters" })
  headMax: number | null;

  @ApiProperty({ description: "Maximum operating temperature in Celsius" })
  maxTemperature: number | null;

  @ApiProperty({ description: "Maximum operating pressure in bar" })
  maxPressure: number | null;

  @ApiProperty({ description: "Suction size DN" })
  suctionSize: string | null;

  @ApiProperty({ description: "Discharge size DN" })
  dischargeSize: string | null;

  @ApiProperty({ description: "Default casing material" })
  casingMaterial: string | null;

  @ApiProperty({ description: "Default impeller material" })
  impellerMaterial: string | null;

  @ApiProperty({ description: "Default shaft material" })
  shaftMaterial: string | null;

  @ApiProperty({ description: "Default seal type" })
  sealType: string | null;

  @ApiProperty({ description: "Motor power in kW" })
  motorPowerKw: number | null;

  @ApiProperty({ description: "Default voltage" })
  voltage: string | null;

  @ApiProperty({ description: "Default frequency" })
  frequency: string | null;

  @ApiProperty({ description: "Weight in kg" })
  weightKg: number | null;

  @ApiProperty({ description: "Certifications as array" })
  certifications: string[];

  @ApiProperty({ description: "Suitable applications as array" })
  applications: string[];

  @ApiProperty({ description: "Base cost from supplier in ZAR" })
  baseCost: number | null;

  @ApiProperty({ description: "List price in ZAR" })
  listPrice: number | null;

  @ApiProperty({ description: "Default markup percentage", example: 15.0 })
  markupPercentage: number;

  @ApiProperty({ description: "Lead time in days" })
  leadTimeDays: number | null;

  @ApiProperty({ description: "Stock available" })
  stockQuantity: number;

  @ApiProperty({ description: "Datasheet URL" })
  datasheetUrl: string | null;

  @ApiProperty({ description: "Image URL" })
  imageUrl: string | null;

  @ApiProperty({ description: "Technical specifications as JSON" })
  specifications: Record<string, any> | null;

  @ApiProperty({ description: "Pump curve data as JSON" })
  pumpCurveData: Record<string, any> | null;

  @ApiProperty({ description: "Notes" })
  notes: string | null;

  supplier: SupplierProfile | null;

  supplierId: number | null;

  createdAt: Date;

  updatedAt: Date;
}
