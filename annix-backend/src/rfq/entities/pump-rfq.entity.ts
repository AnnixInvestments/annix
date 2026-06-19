import { ApiProperty } from "@nestjs/swagger";
import { RfqItem } from "./rfq-item.entity";

export enum PumpCategory {
  CENTRIFUGAL = "centrifugal",
  POSITIVE_DISPLACEMENT = "positive_displacement",
  SPECIALTY = "specialty",
}

export enum PumpServiceType {
  NEW_PUMP = "new_pump",
  SPARE_PARTS = "spare_parts",
  REPAIR_SERVICE = "repair_service",
  RENTAL = "rental",
}

export enum PumpMotorType {
  ELECTRIC_AC = "electric_ac",
  ELECTRIC_VFD = "electric_vfd",
  DIESEL = "diesel",
  HYDRAULIC = "hydraulic",
  AIR = "air",
  NONE = "none",
}

export enum PumpSealType {
  GLAND_PACKING = "gland_packing",
  MECHANICAL_SINGLE = "mechanical_single",
  MECHANICAL_DOUBLE = "mechanical_double",
  CARTRIDGE = "cartridge",
  DRY_RUNNING = "dry_running",
  MAGNETIC_DRIVE = "magnetic_drive",
}

export class PumpRfq {
  @ApiProperty({ description: "Primary key", example: 1 })
  id: number;

  @ApiProperty({ description: "Service type", enum: PumpServiceType })
  serviceType: PumpServiceType;

  @ApiProperty({ description: "Pump type", example: "centrifugal_end_suction" })
  pumpType: string;

  @ApiProperty({ description: "Pump category", enum: PumpCategory })
  pumpCategory?: PumpCategory;

  @ApiProperty({ description: "Flow rate in m³/h" })
  flowRate?: number;

  @ApiProperty({ description: "Total dynamic head in meters" })
  totalHead?: number;

  @ApiProperty({ description: "Suction head/lift in meters" })
  suctionHead?: number;

  @ApiProperty({ description: "NPSHa in meters" })
  npshAvailable?: number;

  @ApiProperty({ description: "Discharge pressure in bar" })
  dischargePressure?: number;

  @ApiProperty({ description: "Operating temperature in Celsius" })
  operatingTemp?: number;

  @ApiProperty({ description: "Fluid type" })
  fluidType: string;

  @ApiProperty({ description: "Specific gravity" })
  specificGravity?: number;

  @ApiProperty({ description: "Viscosity in cP" })
  viscosity?: number;

  @ApiProperty({ description: "Solids content percentage" })
  solidsContent?: number;

  @ApiProperty({ description: "Max solids size in mm" })
  solidsSize?: number;

  @ApiProperty({ description: "pH level" })
  ph?: number;

  @ApiProperty({ description: "Is fluid abrasive" })
  isAbrasive: boolean;

  @ApiProperty({ description: "Is fluid corrosive" })
  isCorrosive: boolean;

  @ApiProperty({ description: "Casing material" })
  casingMaterial: string;

  @ApiProperty({ description: "Impeller material" })
  impellerMaterial: string;

  @ApiProperty({ description: "Shaft material" })
  shaftMaterial?: string;

  @ApiProperty({ description: "Seal type", enum: PumpSealType })
  sealType?: PumpSealType;

  @ApiProperty({ description: "API 682 seal flush plan" })
  sealPlan?: string;

  @ApiProperty({ description: "Suction size DN" })
  suctionSize?: string;

  @ApiProperty({ description: "Discharge size DN" })
  dischargeSize?: string;

  @ApiProperty({ description: "Connection type" })
  connectionType?: string;

  @ApiProperty({ description: "Motor type", enum: PumpMotorType })
  motorType: PumpMotorType;

  @ApiProperty({ description: "Motor power in kW" })
  motorPower?: number;

  @ApiProperty({ description: "Voltage" })
  voltage?: string;

  @ApiProperty({ description: "Frequency" })
  frequency?: string;

  @ApiProperty({ description: "Motor efficiency class" })
  motorEfficiency?: string;

  @ApiProperty({ description: "Motor enclosure type" })
  enclosure?: string;

  @ApiProperty({ description: "Hazardous area classification" })
  hazardousArea: string;

  @ApiProperty({ description: "Certifications as array" })
  certifications: string[];

  @ApiProperty({ description: "Spare part category (for spare parts service)" })
  sparePartCategory?: string;

  @ApiProperty({
    description: "Spare parts list as JSON (for spare parts service)",
  })
  spareParts?: Record<string, any>[];

  @ApiProperty({ description: "Existing pump make/model (for parts/repair)" })
  existingPumpModel?: string;

  @ApiProperty({ description: "Existing pump serial number" })
  existingPumpSerial?: string;

  @ApiProperty({ description: "Rental duration in days (for rental)" })
  rentalDurationDays?: number;

  @ApiProperty({ description: "Quantity value", example: 1 })
  quantityValue: number;

  @ApiProperty({ description: "Supplier reference" })
  supplierReference?: string;

  @ApiProperty({ description: "Unit cost from supplier" })
  unitCostFromSupplier?: number;

  @ApiProperty({ description: "Markup percentage", example: 15.0 })
  markupPercentage: number;

  @ApiProperty({ description: "Unit cost in Rand" })
  unitCost?: number;

  @ApiProperty({ description: "Total cost in Rand" })
  totalCost?: number;

  @ApiProperty({ description: "Additional notes" })
  notes?: string;

  @ApiProperty({ description: "Calculation data as JSON" })
  calculationData?: Record<string, any>;

  rfqItem: RfqItem;

  createdAt: Date;

  updatedAt: Date;
}
