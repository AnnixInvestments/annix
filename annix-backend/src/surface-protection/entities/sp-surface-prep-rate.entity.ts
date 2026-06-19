import { ApiProperty } from "@nestjs/swagger";
export enum SurfacePrepGrade {
  SA_1 = "Sa 1",
  SA_2 = "Sa 2",
  SA_2_5 = "Sa 2.5",
  SA_3 = "Sa 3",
  ST_2 = "St 2",
  ST_3 = "St 3",
}

export enum SurfacePrepMethod {
  ABRASIVE_BLASTING = "abrasive_blasting",
  WATER_JETTING = "water_jetting",
  POWER_TOOL_CLEANING = "power_tool_cleaning",
  HAND_TOOL_CLEANING = "hand_tool_cleaning",
  CHEMICAL_CLEANING = "chemical_cleaning",
  SWEEP_BLASTING = "sweep_blasting",
}

export enum SubstrateMaterial {
  CARBON_STEEL = "carbon_steel",
  STAINLESS_STEEL = "stainless_steel",
  GALVANIZED_STEEL = "galvanized_steel",
  ALUMINUM = "aluminum",
  CONCRETE = "concrete",
  PREVIOUSLY_COATED = "previously_coated",
}

export class SpSurfacePrepRate {
  @ApiProperty({ description: "Primary key", example: 1 })
  id: number;

  @ApiProperty({ description: "Rate code for reference", example: "BLAST-SA25" })
  rateCode: string;

  @ApiProperty({ description: "Preparation method name" })
  methodName: string;

  @ApiProperty({ description: "Surface preparation grade", enum: SurfacePrepGrade })
  prepGrade: SurfacePrepGrade;

  @ApiProperty({ description: "Preparation method", enum: SurfacePrepMethod })
  prepMethod: SurfacePrepMethod;

  @ApiProperty({ description: "Substrate material", enum: SubstrateMaterial })
  substrateMaterial: SubstrateMaterial;

  @ApiProperty({ description: "Description", required: false })
  description?: string;

  @ApiProperty({ description: "Minimum surface profile in microns", required: false })
  minProfileUm?: number;

  @ApiProperty({ description: "Maximum surface profile in microns", required: false })
  maxProfileUm?: number;

  @ApiProperty({ description: "Price per m2 for labour and equipment" })
  pricePerM2: number;

  @ApiProperty({ description: "Abrasive cost per m2 (if applicable)", required: false })
  abrasiveCostPerM2?: number;

  @ApiProperty({ description: "Shop application multiplier", default: 1.0 })
  shopMultiplier: number;

  @ApiProperty({ description: "Field application multiplier", default: 1.5 })
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
