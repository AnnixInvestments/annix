import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";
import { JobSourceProvider } from "../entities/job-market-source.entity";

export class CreateJobMarketSourceDto {
  @IsEnum(JobSourceProvider)
  provider: JobSourceProvider;

  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  apiId?: string;

  @IsString()
  @IsOptional()
  apiKey?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  countryCodes?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  categories?: string[];

  @IsInt()
  @Min(1)
  @Max(24)
  @IsOptional()
  ingestionIntervalHours?: number;
}

export class UpdateJobMarketSourceDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  apiId?: string;

  @IsString()
  @IsOptional()
  apiKey?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  countryCodes?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  categories?: string[];

  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @IsInt()
  @Min(1)
  @Max(24)
  @IsOptional()
  ingestionIntervalHours?: number;
}
