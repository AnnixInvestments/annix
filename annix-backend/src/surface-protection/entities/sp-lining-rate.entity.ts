import { ApiProperty } from "@nestjs/swagger";
export enum LiningCategory {
  NATURAL_RUBBER = "natural_rubber",
  NEOPRENE = "neoprene",
  NITRILE = "nitrile",
  BUTYL = "butyl",
  EPDM = "epdm",
  HYPALON = "hypalon",
  VITON = "viton",
  POLYURETHANE = "polyurethane",
  ALUMINA_92 = "alumina_92",
  ALUMINA_99 = "alumina_99",
  ZTA = "zta",
  SILICON_CARBIDE = "silicon_carbide",
  BASALT = "basalt",
  HDPE = "hdpe",
  GLASS_FLAKE = "glass_flake",
}

export enum LiningType {
  RUBBER = "rubber",
  CERAMIC = "ceramic",
  POLYMER = "polymer",
}

export enum CureMethod {
  AUTOCLAVE = "autoclave",
  COLD_VULCANIZATION = "cold_vulcanization",
  AMBIENT = "ambient",
}

export class SpLiningRate {
  @ApiProperty({ description: "Primary key", example: 1 })
  id: number;

  @ApiProperty({ description: "Rate code for reference", example: "NR-6MM" })
  rateCode: string;

  @ApiProperty({ description: "Lining system name" })
  systemName: string;

  @ApiProperty({ description: "Lining type", enum: LiningType })
  liningType: LiningType;

  @ApiProperty({ description: "Lining category/material", enum: LiningCategory })
  liningCategory: LiningCategory;

  @ApiProperty({ description: "Lining thickness in mm" })
  thicknessMm: number;

  @ApiProperty({ description: "System description", required: false })
  description?: string;

  @ApiProperty({ description: "Rubber hardness IRHD (for rubber)", required: false })
  hardnessIrhd?: number;

  @ApiProperty({ description: "Cure method (for rubber)", enum: CureMethod, required: false })
  cureMethod?: CureMethod;

  @ApiProperty({ description: "Ceramic tile size in mm (for ceramic)", required: false })
  tileSizeMm?: string;

  @ApiProperty({ description: "Maximum operating temperature in Celsius" })
  maxTempC?: number;

  @ApiProperty({ description: "Price per m2 for material" })
  materialPricePerM2: number;

  @ApiProperty({ description: "Price per m2 for installation labour" })
  labourPricePerM2: number;

  @ApiProperty({ description: "Adhesive price per m2", required: false })
  adhesivePricePerM2?: number;

  @ApiProperty({ description: "Total price per m2" })
  totalPricePerM2: number;

  @ApiProperty({ description: "Autoclave cure premium multiplier", default: 1.0 })
  autoclaveMultiplier: number;

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
