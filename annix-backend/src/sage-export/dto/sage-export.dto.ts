import { IsBoolean, IsOptional, IsString } from "class-validator";
import { Transform } from "class-transformer";

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
}
