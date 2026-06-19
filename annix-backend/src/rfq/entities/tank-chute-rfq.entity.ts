import { ApiProperty } from "@nestjs/swagger";
import { RfqItem } from "./rfq-item.entity";

export enum AssemblyType {
  TANK = "tank",
  CHUTE = "chute",
  HOPPER = "hopper",
  UNDERPAN = "underpan",
  CUSTOM = "custom",
}

export enum LiningType {
  RUBBER = "rubber",
  CERAMIC = "ceramic",
  HDPE = "hdpe",
  PU = "pu",
  GLASS_FLAKE = "glass_flake",
  NONE = "none",
}

export interface PlateBomItem {
  mark: string;
  description: string;
  thicknessMm: number;
  lengthMm: number;
  widthMm: number;
  quantity: number;
  weightKg: number;
  areaM2: number;
}

export class TankChuteRfq {
  @ApiProperty({ description: "Primary key", example: 1 })
  id: number;

  @ApiProperty({ description: "Assembly type", enum: AssemblyType })
  assemblyType: AssemblyType;

  @ApiProperty({ description: "Drawing reference number" })
  drawingReference?: string;

  @ApiProperty({ description: "Material grade (e.g. S355JR, Bisalloy 400)" })
  materialGrade?: string;

  @ApiProperty({ description: "Overall length in mm" })
  overallLengthMm?: number;

  @ApiProperty({ description: "Overall width in mm" })
  overallWidthMm?: number;

  @ApiProperty({ description: "Overall height in mm" })
  overallHeightMm?: number;

  @ApiProperty({ description: "Total steel weight in kg" })
  totalSteelWeightKg?: number;

  @ApiProperty({ description: "Weight source: manual or calculated" })
  weightSource?: string;

  @ApiProperty({ description: "Number of identical assemblies", example: 1 })
  quantityValue: number;

  @ApiProperty({ description: "Whether internal lining is required" })
  liningRequired: boolean;

  @ApiProperty({ description: "Lining type", enum: LiningType })
  liningType?: LiningType;

  @ApiProperty({ description: "Lining thickness in mm" })
  liningThicknessMm?: number;

  @ApiProperty({ description: "Internal lining area in m²" })
  liningAreaM2?: number;

  @ApiProperty({ description: "Lining wastage percentage" })
  liningWastagePercent?: number;

  @ApiProperty({ description: "Rubber grade (when lining type is rubber)" })
  rubberGrade?: string;

  @ApiProperty({ description: "Rubber hardness Shore A" })
  rubberHardnessShore?: number;

  @ApiProperty({ description: "Whether external coating is required" })
  coatingRequired: boolean;

  @ApiProperty({ description: "Coating system description" })
  coatingSystem?: string;

  @ApiProperty({ description: "External coating area in m²" })
  coatingAreaM2?: number;

  @ApiProperty({ description: "Coating wastage percentage" })
  coatingWastagePercent?: number;

  @ApiProperty({ description: "Surface preparation standard (e.g. Sa 2.5)" })
  surfacePrepStandard?: string;

  @ApiProperty({ description: "Plate BOM as JSON array" })
  plateBom?: PlateBomItem[];

  @ApiProperty({ description: "BOM total weight in kg" })
  bomTotalWeightKg?: number;

  @ApiProperty({ description: "BOM total area in m²" })
  bomTotalAreaM2?: number;

  @ApiProperty({ description: "Steel price per kg" })
  steelPricePerKg?: number;

  @ApiProperty({ description: "Lining price per m²" })
  liningPricePerM2?: number;

  @ApiProperty({ description: "Coating price per m²" })
  coatingPricePerM2?: number;

  @ApiProperty({ description: "Fabrication cost" })
  fabricationCost?: number;

  @ApiProperty({ description: "Total cost" })
  totalCost?: number;

  @ApiProperty({ description: "Additional notes" })
  notes?: string;

  @ApiProperty({ description: "Calculation data as JSON" })
  calculationData?: Record<string, unknown>;

  rfqItem: RfqItem;

  createdAt: Date;

  updatedAt: Date;
}
