import { ApiSchema } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from "class-validator";

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

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateRubberBondingAgentDto)
  rows: CreateRubberBondingAgentDto[];
}
