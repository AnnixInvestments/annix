import { IsArray, IsBoolean, IsInt, IsOptional, IsString, Max, Min } from "class-validator";
import {
  OptionalEmail,
  OptionalIn,
  OptionalInt,
  OptionalString,
  RequiredString,
} from "../../lib/dto/validation-decorators";
import { EmploymentType } from "../entities/job-posting.entity";

const EMPLOYMENT_TYPE_VALUES = [
  EmploymentType.FULL_TIME,
  EmploymentType.PART_TIME,
  EmploymentType.CONTRACT,
  EmploymentType.TEMPORARY,
  EmploymentType.INTERNSHIP,
  EmploymentType.LEARNERSHIP,
] as const;

export class CreateJobPostingDto {
  @RequiredString({ maxLength: 255 })
  title: string;

  @OptionalString()
  description?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  requiredSkills?: string[];

  @OptionalInt({ min: 0, max: 60 })
  minExperienceYears?: number;

  @OptionalString({ maxLength: 255 })
  requiredEducation?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  requiredCertifications?: string[];

  @OptionalString({ maxLength: 255 })
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

  @OptionalInt({ min: 1, max: 90 })
  responseTimelineDays?: number;

  @OptionalString({ maxLength: 255 })
  location?: string;

  @OptionalString({ maxLength: 50 })
  province?: string;

  @OptionalIn(EMPLOYMENT_TYPE_VALUES)
  employmentType?: string;

  @OptionalInt({ min: 0 })
  salaryMin?: number;

  @OptionalInt({ min: 0 })
  salaryMax?: number;

  @OptionalString({ maxLength: 3 })
  salaryCurrency?: string;

  @OptionalEmail({ maxLength: 255 })
  applyByEmail?: string;
}

export class UpdateJobPostingDto {
  @OptionalString({ maxLength: 255 })
  title?: string;

  @OptionalString()
  description?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  requiredSkills?: string[];

  @OptionalInt({ min: 0, max: 60 })
  minExperienceYears?: number;

  @OptionalString({ maxLength: 255 })
  requiredEducation?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  requiredCertifications?: string[];

  @OptionalString({ maxLength: 255 })
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

  @OptionalString({ maxLength: 20 })
  status?: string;

  @OptionalInt({ min: 1, max: 90 })
  responseTimelineDays?: number;

  @OptionalString({ maxLength: 255 })
  location?: string;

  @OptionalString({ maxLength: 50 })
  province?: string;

  @OptionalIn(EMPLOYMENT_TYPE_VALUES)
  employmentType?: string;

  @OptionalInt({ min: 0 })
  salaryMin?: number;

  @OptionalInt({ min: 0 })
  salaryMax?: number;

  @OptionalString({ maxLength: 3 })
  salaryCurrency?: string;

  @OptionalEmail({ maxLength: 255 })
  applyByEmail?: string;
}
