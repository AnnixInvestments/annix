import { IsNumber, IsOptional, IsString, Min } from "class-validator";

export class CreateStockItemDto {
  @IsString()
  sku: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  unitOfMeasure?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  costPerUnit?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  quantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minStockLevel?: number;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  photoUrl?: string;
}
