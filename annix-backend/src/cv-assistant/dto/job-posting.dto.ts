import { IsArray, IsBoolean, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class CreateJobPostingDto {
  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  requiredSkills?: string[];

  @IsInt()
  @Min(0)
  @IsOptional()
  minExperienceYears?: number;

  @IsString()
  @IsOptional()
  requiredEducation?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  requiredCertifications?: string[];

  @IsString()
  @IsOptional()
  emailSubjectPattern?: string;

  @IsBoolean()
  @IsOptional()
  autoRejectEnabled?: boolean;

  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  autoRejectThreshold?: number;

  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  autoAcceptThreshold?: number;
}

export class UpdateJobPostingDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  requiredSkills?: string[];

  @IsInt()
  @Min(0)
  @IsOptional()
  minExperienceYears?: number;

  @IsString()
  @IsOptional()
  requiredEducation?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  requiredCertifications?: string[];

  @IsString()
  @IsOptional()
  emailSubjectPattern?: string;

  @IsBoolean()
  @IsOptional()
  autoRejectEnabled?: boolean;

  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  autoRejectThreshold?: number;

  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  autoAcceptThreshold?: number;

  @IsString()
  @IsOptional()
  status?: string;
}
