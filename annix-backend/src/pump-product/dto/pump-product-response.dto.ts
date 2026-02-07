import { ApiProperty } from "@nestjs/swagger";
import { PumpProductCategory, PumpProductStatus } from "../entities/pump-product.entity";

export class PumpProductResponseDto {
  @ApiProperty({ description: "Primary key" })
  id: number;

  @ApiProperty({ description: "Product SKU/code" })
  sku: string;

  @ApiProperty({ description: "Product title" })
  title: string;

  @ApiProperty({ description: "Product description" })
  description: string | null;

  @ApiProperty({ description: "Pump type code" })
  pumpType: string;

  @ApiProperty({ description: "Pump category", enum: PumpProductCategory })
  category: PumpProductCategory;

  @ApiProperty({ description: "Product status", enum: PumpProductStatus })
  status: PumpProductStatus;

  @ApiProperty({ description: "Manufacturer name" })
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

  @ApiProperty({ description: "Certifications" })
  certifications: string[];

  @ApiProperty({ description: "Suitable applications" })
  applications: string[];

  @ApiProperty({ description: "Base cost from supplier in ZAR" })
  baseCost: number | null;

  @ApiProperty({ description: "List price in ZAR" })
  listPrice: number | null;

  @ApiProperty({ description: "Default markup percentage" })
  markupPercentage: number;

  @ApiProperty({ description: "Lead time in days" })
  leadTimeDays: number | null;

  @ApiProperty({ description: "Stock quantity" })
  stockQuantity: number;

  @ApiProperty({ description: "Datasheet URL" })
  datasheetUrl: string | null;

  @ApiProperty({ description: "Image URL" })
  imageUrl: string | null;

  @ApiProperty({ description: "Technical specifications" })
  specifications: Record<string, any> | null;

  @ApiProperty({ description: "Pump curve data" })
  pumpCurveData: Record<string, any> | null;

  @ApiProperty({ description: "Notes" })
  notes: string | null;

  @ApiProperty({ description: "Supplier ID" })
  supplierId: number | null;

  @ApiProperty({ description: "Created timestamp" })
  createdAt: Date;

  @ApiProperty({ description: "Updated timestamp" })
  updatedAt: Date;
}

export class PumpProductListResponseDto {
  @ApiProperty({
    description: "List of pump products",
    type: [PumpProductResponseDto],
  })
  items: PumpProductResponseDto[];

  @ApiProperty({ description: "Total count" })
  total: number;

  @ApiProperty({ description: "Current page" })
  page: number;

  @ApiProperty({ description: "Items per page" })
  limit: number;
}
