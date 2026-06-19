import { ApiSchema } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from "class-validator";

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
  @IsNumber()
  @Min(0)
  packSizeLitres?: number | null;

  @IsNumber()
  @Min(0)
  volumeSolidsPercent: number;

  @IsNumber()
  @Min(0)
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
  @IsNumber()
  @Min(0)
  packSizeLitres?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  volumeSolidsPercent?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
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
}

@ApiSchema({ name: "StockControlPaintDiscountTierDto" })
export class PaintDiscountTierDto {
  @IsString()
  name: string;

  @IsNumber()
  @Min(0)
  discountPercent: number;
}

@ApiSchema({ name: "StockControlUpdatePaintPricingConfigDto" })
export class UpdatePaintPricingConfigDto {
  @IsNumber()
  @Min(0)
  lossPct: number;

  @IsNumber()
  @Min(0)
  applicationCostPerM2: number;

  @IsNumber()
  @Min(0)
  markupFactor: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaintDiscountTierDto)
  discountTiers: PaintDiscountTierDto[];
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

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatePaintPriceListItemDto)
  rows: CreatePaintPriceListItemDto[];
}
