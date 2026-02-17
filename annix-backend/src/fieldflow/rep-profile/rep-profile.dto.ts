import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";

export class TargetCustomerProfileDto {
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  businessTypes?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  companySizes?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  decisionMakerTitles?: string[];
}

export class CreateRepProfileDto {
  @ApiProperty({ description: "Industry code from the industry options" })
  @IsString()
  @MaxLength(100)
  industry: string;

  @ApiProperty({ description: "Sub-industry codes from the industry options", type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  subIndustries: string[];

  @ApiProperty({ description: "Array of product category codes", type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  productCategories: string[];

  @ApiPropertyOptional({ description: "Company name the rep works for" })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  companyName?: string;

  @ApiPropertyOptional({ description: "Job title of the rep" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  jobTitle?: string;

  @ApiPropertyOptional({ description: "Description of the rep's sales territory" })
  @IsOptional()
  @IsString()
  territoryDescription?: string;

  @ApiPropertyOptional({ description: "Default search center latitude" })
  @IsOptional()
  @IsNumber()
  defaultSearchLatitude?: number;

  @ApiPropertyOptional({ description: "Default search center longitude" })
  @IsOptional()
  @IsNumber()
  defaultSearchLongitude?: number;

  @ApiPropertyOptional({ description: "Default search radius in kilometers", default: 25 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  defaultSearchRadiusKm?: number;

  @ApiPropertyOptional({ description: "Target customer profile preferences" })
  @IsOptional()
  targetCustomerProfile?: TargetCustomerProfileDto;

  @ApiPropertyOptional({ description: "Custom search terms for finding prospects", type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  customSearchTerms?: string[];
}

export class UpdateRepProfileDto {
  @ApiPropertyOptional({ description: "Industry code from the industry options" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  industry?: string;

  @ApiPropertyOptional({
    description: "Sub-industry codes from the industry options",
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  subIndustries?: string[];

  @ApiPropertyOptional({ description: "Array of product category codes", type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  productCategories?: string[];

  @ApiPropertyOptional({ description: "Company name the rep works for" })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  companyName?: string;

  @ApiPropertyOptional({ description: "Job title of the rep" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  jobTitle?: string;

  @ApiPropertyOptional({ description: "Description of the rep's sales territory" })
  @IsOptional()
  @IsString()
  territoryDescription?: string;

  @ApiPropertyOptional({ description: "Default search center latitude" })
  @IsOptional()
  @IsNumber()
  defaultSearchLatitude?: number;

  @ApiPropertyOptional({ description: "Default search center longitude" })
  @IsOptional()
  @IsNumber()
  defaultSearchLongitude?: number;

  @ApiPropertyOptional({ description: "Default search radius in kilometers" })
  @IsOptional()
  @IsNumber()
  @Min(1)
  defaultSearchRadiusKm?: number;

  @ApiPropertyOptional({ description: "Target customer profile preferences" })
  @IsOptional()
  targetCustomerProfile?: TargetCustomerProfileDto;

  @ApiPropertyOptional({ description: "Custom search terms for finding prospects", type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  customSearchTerms?: string[];

  @ApiPropertyOptional({ description: "Mark setup as completed" })
  @IsOptional()
  @IsBoolean()
  setupCompleted?: boolean;
}

export class RepProfileResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  userId: number;

  @ApiProperty()
  industry: string;

  @ApiProperty({ type: [String] })
  subIndustries: string[];

  @ApiProperty({ type: [String] })
  productCategories: string[];

  @ApiPropertyOptional()
  companyName: string | null;

  @ApiPropertyOptional()
  jobTitle: string | null;

  @ApiPropertyOptional()
  territoryDescription: string | null;

  @ApiPropertyOptional()
  defaultSearchLatitude: number | null;

  @ApiPropertyOptional()
  defaultSearchLongitude: number | null;

  @ApiProperty()
  defaultSearchRadiusKm: number;

  @ApiPropertyOptional()
  targetCustomerProfile: TargetCustomerProfileDto | null;

  @ApiPropertyOptional({ type: [String] })
  customSearchTerms: string[] | null;

  @ApiProperty()
  setupCompleted: boolean;

  @ApiPropertyOptional()
  setupCompletedAt: Date | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class RepProfileStatusDto {
  @ApiProperty({ description: "Whether the rep has completed initial setup" })
  setupCompleted: boolean;

  @ApiPropertyOptional({ description: "Profile data if setup is completed" })
  profile: RepProfileResponseDto | null;
}
