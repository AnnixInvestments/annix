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

const FAMILIES = ["plate", "pipe"] as const;
const CURE_TYPES = ["steam", "precured", "chemical"] as const;

@ApiSchema({ name: "StockControlRubberCreatePriceListItemDto" })
export class CreateRubberPriceListItemDto {
  @IsString()
  supplier: string;

  @IsString()
  productCode: string;

  @IsOptional()
  @IsString()
  productName?: string | null;

  @IsOptional()
  @IsIn(CURE_TYPES)
  cureType?: string | null;

  @IsOptional()
  @IsString()
  bondingType?: string | null;

  @IsOptional()
  @IsString()
  colour?: string | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  shoreHardness?: number | null;

  @IsNumber()
  @Min(0)
  specificGravity: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  costPerKg?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  upliftPercent?: number | null;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsBoolean()
  preferred?: boolean;
}

@ApiSchema({ name: "StockControlRubberUpdatePriceListItemDto" })
export class UpdateRubberPriceListItemDto {
  @IsOptional()
  @IsString()
  supplier?: string;

  @IsOptional()
  @IsString()
  productCode?: string;

  @IsOptional()
  @IsString()
  productName?: string | null;

  @IsOptional()
  @IsIn(CURE_TYPES)
  cureType?: string | null;

  @IsOptional()
  @IsString()
  bondingType?: string | null;

  @IsOptional()
  @IsString()
  colour?: string | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  shoreHardness?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  specificGravity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  costPerKg?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  upliftPercent?: number | null;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsBoolean()
  preferred?: boolean;
}

@ApiSchema({ name: "StockControlRubberLabourComponentConfigDto" })
export class RubberLabourComponentConfigDto {
  @IsString()
  department: string;

  @IsNumber()
  @Min(0)
  m2PerHour: number;
}

@ApiSchema({ name: "StockControlRubberNbFactorConfigDto" })
export class RubberNbFactorConfigDto {
  @IsString()
  nb: string;

  @IsNumber()
  pie: number;

  @IsNumber()
  additional: number;
}

@ApiSchema({ name: "StockControlRubberFamilyPricingConfigDto" })
export class RubberFamilyPricingConfigDto {
  @IsNumber()
  @Min(0)
  wastePct: number;

  @IsNumber()
  @Min(0)
  markupFactor: number;

  @IsNumber()
  @Min(0)
  mpsFactor: number;

  @IsArray()
  @IsNumber({}, { each: true })
  thicknessesMm: number[];

  @ValidateNested()
  @Type(() => RubberLabourComponentConfigDto)
  rubberLining: RubberLabourComponentConfigDto;

  @ValidateNested()
  @Type(() => RubberLabourComponentConfigDto)
  handling: RubberLabourComponentConfigDto;

  @ValidateNested()
  @Type(() => RubberLabourComponentConfigDto)
  finishing: RubberLabourComponentConfigDto;

  @ValidateNested()
  @Type(() => RubberLabourComponentConfigDto)
  solution: RubberLabourComponentConfigDto;

  cwAgentBaselinePerM2: Record<string, number>;

  @IsOptional()
  cwRecipes?: Record<string, string[]>;
}

@ApiSchema({ name: "StockControlRubberPipePricingConfigDto" })
export class RubberPipePricingConfigDto extends RubberFamilyPricingConfigDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RubberNbFactorConfigDto)
  nbFactors: RubberNbFactorConfigDto[];
}

@ApiSchema({ name: "StockControlRubberBlastingConfigDto" })
export class RubberBlastingConfigDto {
  @IsNumber()
  @Min(0)
  elecAvgRate: number;

  @IsNumber()
  @Min(0)
  elecAvgKwh: number;

  @IsNumber()
  @Min(0)
  gritBagCost: number;

  @IsNumber()
  @Min(0)
  gritM2PerBag: number;

  @IsNumber()
  @Min(0)
  m2PerHour: number;

  @IsNumber()
  @Min(0)
  crewSize: number;

  @IsNumber()
  @Min(0)
  margin: number;
}

@ApiSchema({ name: "StockControlRubberParaffinConfigDto" })
export class RubberParaffinConfigDto {
  @IsNumber()
  @Min(0)
  ltrsPerCure: number;

  @IsNumber()
  @Min(0)
  costPerLitre: number;

  @IsNumber()
  @Min(0)
  m2PerPot: number;
}

@ApiSchema({ name: "StockControlRubberUpdatePricingConfigDto" })
export class UpdateRubberPricingConfigDto {
  @ValidateNested()
  @Type(() => RubberParaffinConfigDto)
  paraffin: RubberParaffinConfigDto;

  @ValidateNested()
  @Type(() => RubberBlastingConfigDto)
  blasting: RubberBlastingConfigDto;

  deptAvgHourly: Record<string, number>;

  @IsNumber()
  @Min(0)
  consumableMarkup: number;

  @ValidateNested()
  @Type(() => RubberFamilyPricingConfigDto)
  plate: RubberFamilyPricingConfigDto;

  @ValidateNested()
  @Type(() => RubberPipePricingConfigDto)
  pipe: RubberPipePricingConfigDto;
}

@ApiSchema({ name: "StockControlRubberQuoteDto" })
export class RubberQuoteDto {
  @IsOptional()
  @IsNumber()
  itemId?: number | null;

  @IsOptional()
  @IsIn(FAMILIES)
  family?: string | null;

  @IsOptional()
  @IsIn(CURE_TYPES)
  cureType?: string | null;

  @IsNumber()
  @Min(0)
  thicknessMm: number;

  @IsOptional()
  @IsString()
  nb?: string | null;

  @IsNumber()
  @Min(0)
  areaOrLength: number;

  @IsOptional()
  @IsString()
  bondingType?: string | null;
}

@ApiSchema({ name: "StockControlRubberBulkUpliftDto" })
export class RubberBulkUpliftDto {
  @IsNumber()
  @Min(0)
  upliftPercent: number;
}

@ApiSchema({ name: "StockControlRubberCommitPriceListImportDto" })
export class RubberCommitImportDto {
  @IsString()
  supplier: string;

  @IsBoolean()
  replaceSupplier: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRubberPriceListItemDto)
  rows: CreateRubberPriceListItemDto[];
}
