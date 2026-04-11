import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

export enum CompanySize {
  MICRO = "micro",
  SMALL = "small",
  MEDIUM = "medium",
  LARGE = "large",
  ENTERPRISE = "enterprise",
}

export class CommonCompanyDto {
  @ApiPropertyOptional({ description: "Registered company name" })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  companyName?: string;

  @ApiPropertyOptional({ description: "Company registration number (e.g. CIPC yyyy/nnnnnn/nn)" })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  registrationNumber?: string;

  @ApiPropertyOptional({ description: "VAT registration number" })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  vatNumber?: string;

  @ApiPropertyOptional({ enum: CompanySize, description: "Company size band" })
  @IsOptional()
  @IsEnum(CompanySize)
  companySize?: CompanySize;

  @ApiPropertyOptional({ description: "B-BBEE level (1-8)", minimum: 1, maximum: 8 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(8)
  beeLevel?: number;

  @ApiPropertyOptional({ description: "ISO 4217 currency code (e.g. ZAR, USD, EUR)" })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currencyCode?: string;
}
