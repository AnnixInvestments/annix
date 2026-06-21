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

const COVERAGE_BASES = ["litre", "gram", "none"] as const;

@ApiSchema({ name: "StockControlRubberBondingAgentCreateDto" })
export class CreateRubberBondingAgentDto {
  @IsOptional()
  @IsString()
  supplier?: string | null;

  @IsString()
  name: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  packSizeLitres?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  pricePerTin?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  pricePerLitre?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  areaCoverPerLitre?: number | null;

  @IsOptional()
  @IsIn(COVERAGE_BASES)
  coverageBasis?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  gramsPerM2?: number | null;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsBoolean()
  preferred?: boolean;
}

@ApiSchema({ name: "StockControlRubberBondingAgentUpdateDto" })
export class UpdateRubberBondingAgentDto {
  @IsOptional()
  @IsString()
  supplier?: string | null;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  packSizeLitres?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  pricePerTin?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  pricePerLitre?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  areaCoverPerLitre?: number | null;

  @IsOptional()
  @IsIn(COVERAGE_BASES)
  coverageBasis?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  gramsPerM2?: number | null;

  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @IsOptional()
  @IsBoolean()
  preferred?: boolean;
}

@ApiSchema({ name: "StockControlRubberBondingAgentCommitImportDto" })
export class RubberBondingAgentCommitImportDto {
  @IsString()
  supplier: string;

  @IsBoolean()
  replaceSupplier: boolean;

  @IsOptional()
  @IsIn(["replace", "append", "update"])
  mode?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRubberBondingAgentDto)
  rows: CreateRubberBondingAgentDto[];
}
