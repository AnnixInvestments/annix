import { ApiSchema } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from "class-validator";

import {
  PAINT_FINISH_TYPES,
  PAINT_GENERIC_TYPES,
} from "../services/paint-price-list-extraction.service";

const COAT_TYPES = ["primer", "intermediate", "final"] as const;

@ApiSchema({ name: "StockControlCreatePaintPriceListItemDto" })
export class CreatePaintPriceListItemDto {
  @IsString()
  supplierName: string;

  @IsOptional()
  @IsIn(COAT_TYPES)
  coatType?: string | null;

  @IsString()
  productName: string;

  @IsOptional()
  @IsString()
  paintType?: string | null;

  @IsOptional()
  @IsIn(PAINT_GENERIC_TYPES)
  genericType?: string | null;

  @IsOptional()
  @IsIn(PAINT_FINISH_TYPES)
  finishType?: string | null;

  @IsOptional()
  @IsBoolean()
  zincRich?: boolean;

  @IsOptional()
  @IsBoolean()
  mioPigment?: boolean;

  @IsOptional()
  @IsBoolean()
  surfaceTolerant?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  heatResistanceC?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  packSizeLitres?: number | null;

  @IsNumber()
  @Min(0.01)
  volumeSolidsPercent: number;

  @IsNumber()
  @Min(0.01)
  costPerLitre: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  costPerKit?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  upliftPercent?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  recommendedMicrons?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  micronsOverride?: number | null;

  @IsOptional()
  @IsString()
  thinnerName?: string | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  thinnerPricePerLitre?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxThinningPercent?: number | null;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsBoolean()
  preferred?: boolean;
}

@ApiSchema({ name: "StockControlUpdatePaintPriceListItemDto" })
export class UpdatePaintPriceListItemDto {
  @IsOptional()
  @IsString()
  supplierName?: string;

  @IsOptional()
  @IsIn(COAT_TYPES)
  coatType?: string | null;

  @IsOptional()
  @IsString()
  productName?: string;

  @IsOptional()
  @IsString()
  paintType?: string | null;

  @IsOptional()
  @IsIn(PAINT_GENERIC_TYPES)
  genericType?: string | null;

  @IsOptional()
  @IsIn(PAINT_FINISH_TYPES)
  finishType?: string | null;

  @IsOptional()
  @IsBoolean()
  zincRich?: boolean;

  @IsOptional()
  @IsBoolean()
  mioPigment?: boolean;

  @IsOptional()
  @IsBoolean()
  surfaceTolerant?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  heatResistanceC?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  packSizeLitres?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  volumeSolidsPercent?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  costPerLitre?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  costPerKit?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  upliftPercent?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  recommendedMicrons?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  micronsOverride?: number | null;

  @IsOptional()
  @IsString()
  thinnerName?: string | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  thinnerPricePerLitre?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxThinningPercent?: number | null;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsBoolean()
  preferred?: boolean;
}

@ApiSchema({ name: "StockControlPaintDiscountTierDto" })
export class PaintDiscountTierDto {
  @IsString()
  name: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  discountPercent: number;
}

@ApiSchema({ name: "StockControlPaintBlastTierPriceDto" })
export class PaintBlastTierPriceDto {
  @IsString()
  name: string;

  @IsNumber()
  @Min(0)
  pricePerM2: number;
}

@ApiSchema({ name: "StockControlPaintBlastGradeDto" })
export class PaintBlastGradeDto {
  @IsString()
  grade: string;

  @IsNumber()
  @Min(0)
  pricePerM2: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaintBlastTierPriceDto)
  tierPrices: PaintBlastTierPriceDto[];
}

@ApiSchema({ name: "StockControlUpdatePaintPricingConfigDto" })
export class UpdatePaintPricingConfigDto {
  @IsNumber()
  @Min(0)
  @Max(99)
  lossPct: number;

  @IsNumber()
  @Min(0)
  applicationCostPerM2: number;

  @IsNumber()
  @Min(1)
  markupFactor: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaintDiscountTierDto)
  discountTiers: PaintDiscountTierDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaintBlastGradeDto)
  blastGrades: PaintBlastGradeDto[];
}

@ApiSchema({ name: "StockControlPackOptionRequestItemDto" })
export class PackOptionRequestItemDto {
  @IsString()
  product: string;

  @IsNumber()
  @Min(0)
  litres: number;
}

@ApiSchema({ name: "StockControlPackOptionsDto" })
export class PackOptionsDto {
  @IsArray()
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => PackOptionRequestItemDto)
  items: PackOptionRequestItemDto[];
}

@ApiSchema({ name: "StockControlMultiCoatQuoteCoatDto" })
export class MultiCoatQuoteCoatDto {
  @IsNumber()
  itemId: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  micronsOverride?: number | null;
}

@ApiSchema({ name: "StockControlMultiCoatQuoteDto" })
export class MultiCoatQuoteDto {
  @IsArray()
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => MultiCoatQuoteCoatDto)
  coats: MultiCoatQuoteCoatDto[];

  @IsOptional()
  @IsString()
  blastGrade?: string | null;

  @IsNumber()
  @Min(0)
  areaM2: number;

  @IsOptional()
  @IsString()
  tierName?: string | null;
}

@ApiSchema({ name: "StockControlPaintQuoteDto" })
export class PaintQuoteDto {
  @IsNumber()
  itemId: number;

  @IsNumber()
  @Min(0)
  areaM2: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  micronsOverride?: number | null;

  @IsOptional()
  @IsString()
  tierName?: string | null;
}

@ApiSchema({ name: "StockControlBulkUpliftDto" })
export class BulkUpliftDto {
  @IsNumber()
  @Min(0)
  upliftPercent: number;
}

@ApiSchema({ name: "StockControlCommitPaintPriceListImportDto" })
export class CommitPaintPriceListImportDto {
  @IsString()
  supplierName: string;

  @IsBoolean()
  replaceSupplier: boolean;

  @IsOptional()
  @IsIn(["replace", "append", "update"])
  mode?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePaintPriceListItemDto)
  rows: CreatePaintPriceListItemDto[];
}
