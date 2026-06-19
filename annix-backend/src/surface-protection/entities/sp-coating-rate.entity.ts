import { ApiProperty } from "@nestjs/swagger";
export enum CoatingCategory {
  EPOXY = "epoxy",
  POLYURETHANE = "polyurethane",
  ZINC_RICH = "zinc_rich",
  POLYSILOXANE = "polysiloxane",
  POLYUREA = "polyurea",
  GLASS_FLAKE = "glass_flake",
  INTUMESCENT = "intumescent",
  SILICONE = "silicone",
  FBE = "fbe",
  THREE_LPE = "3lpe",
  HDG = "hdg",
}

export enum ISO12944Category {
  C1 = "C1",
  C2 = "C2",
  C3 = "C3",
  C4 = "C4",
  C5 = "C5",
  CX = "CX",
  IM1 = "Im1",
  IM2 = "Im2",
  IM3 = "Im3",
  IM4 = "Im4",
}

export enum DurabilityClass {
  LOW = "L",
  MEDIUM = "M",
  HIGH = "H",
  VERY_HIGH = "VH",
}

export class SpCoatingRate {
  @ApiProperty({ description: "Primary key", example: 1 })
  id: number;

  @ApiProperty({ description: "Rate code for reference", example: "EPOXY-C3-H" })
  rateCode: string;

  @ApiProperty({ description: "Coating system name" })
  systemName: string;

  @ApiProperty({ description: "Coating category", enum: CoatingCategory })
  coatingCategory: CoatingCategory;

  @ApiProperty({
    description: "ISO 12944 corrosivity category",
    enum: ISO12944Category,
    required: false,
  })
  iso12944Category?: ISO12944Category;

  @ApiProperty({
    description: "Durability class",
    enum: DurabilityClass,
    required: false,
  })
  durabilityClass?: DurabilityClass;

  @ApiProperty({ description: "System description" })
  description?: string;

  @ApiProperty({ description: "Total nominal DFT in microns" })
  totalDftUm: number;

  @ApiProperty({ description: "Number of coats" })
  numberOfCoats: number;

  @ApiProperty({ description: "Price per m2 for material" })
  materialPricePerM2: number;

  @ApiProperty({ description: "Price per m2 for application labour" })
  labourPricePerM2: number;

  @ApiProperty({ description: "Total price per m2 (material + labour)" })
  totalPricePerM2: number;

  @ApiProperty({ description: "Shop application multiplier", default: 1.0 })
  shopMultiplier: number;

  @ApiProperty({ description: "Field application multiplier", default: 1.3 })
  fieldMultiplier: number;

  @ApiProperty({ description: "Currency code", default: "ZAR" })
  currency: string;

  @ApiProperty({ description: "Supplier company ID", required: false })
  supplierId?: number;

  @ApiProperty({ description: "Effective from date", required: false })
  effectiveFrom?: Date;

  @ApiProperty({ description: "Effective to date", required: false })
  effectiveTo?: Date;

  @ApiProperty({ description: "Is rate active", default: true })
  isActive: boolean;

  createdAt: Date;

  updatedAt: Date;
}
