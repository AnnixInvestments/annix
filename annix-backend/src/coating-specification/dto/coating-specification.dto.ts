import { IsString, IsNumber, IsOptional, IsIn } from 'class-validator';

export class CreateCoatingStandardDto {
  @IsString()
  code: string;

  @IsString()
  description: string;

  @IsString()
  generalSurfacePreparation: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateCoatingEnvironmentDto {
  @IsNumber()
  standardId: number;

  @IsString()
  category: string;

  @IsString()
  description: string;

  @IsString()
  surfacePreparation: string;
}

export class CreateCoatingSpecificationDto {
  @IsNumber()
  environmentId: number;

  @IsIn(['external', 'internal'])
  coatingType: string;

  @IsString()
  lifespan: string;

  @IsString()
  system: string;

  @IsString()
  coats: string;

  @IsString()
  totalDftUmRange: string;

  @IsString()
  applications: string;
}

export class GetRecommendedCoatingDto {
  @IsString()
  standardCode: string; // "ISO 12944" or "NORSOK M-501"

  @IsString()
  category: string; // e.g., "C3", "C5", "CX"

  @IsIn(['external', 'internal'])
  coatingType: string;

  @IsOptional()
  @IsString()
  lifespan?: string; // "Low", "Medium", "High", "Very High"
}
