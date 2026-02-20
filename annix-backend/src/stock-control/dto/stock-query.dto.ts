import { IsOptional, IsString } from "class-validator";

export class StockQueryDto {
  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  belowMinStock?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  limit?: string;
}
