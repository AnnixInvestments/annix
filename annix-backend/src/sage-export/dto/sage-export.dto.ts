import { Transform } from "class-transformer";
import { IsBoolean, IsOptional, IsString } from "class-validator";

export class SageExportFilterDto {
  @IsOptional()
  @IsString()
  dateFrom?: string;

  @IsOptional()
  @IsString()
  dateTo?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === "true" || value === true)
  excludeExported?: boolean;

  @IsOptional()
  @IsString()
  invoiceType?: string;
}
