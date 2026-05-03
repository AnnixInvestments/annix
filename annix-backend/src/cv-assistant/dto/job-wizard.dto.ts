import { Type } from "class-transformer";
import { IsArray, IsIn, IsInt, IsOptional, Max, Min, ValidateNested } from "class-validator";
import {
  OptionalEmail,
  OptionalIn,
  OptionalInt,
  OptionalString,
  OptionalStringArray,
  RequiredString,
} from "../../lib/dto/validation-decorators";
import { EmploymentType, WorkMode } from "../entities/job-posting.entity";
import { ScreeningQuestionType } from "../entities/job-screening-question.entity";
import { SkillImportance, SkillProficiency } from "../entities/job-skill.entity";
import { SuccessMetricTimeframe } from "../entities/job-success-metric.entity";

const EMPLOYMENT_TYPE_VALUES = [
  EmploymentType.FULL_TIME,
  EmploymentType.PART_TIME,
  EmploymentType.CONTRACT,
  EmploymentType.TEMPORARY,
  EmploymentType.INTERNSHIP,
  EmploymentType.LEARNERSHIP,
] as const;

const WORK_MODE_VALUES = [WorkMode.ON_SITE, WorkMode.HYBRID, WorkMode.REMOTE] as const;

const SKILL_IMPORTANCE_VALUES = [SkillImportance.REQUIRED, SkillImportance.PREFERRED] as const;

const SKILL_PROFICIENCY_VALUES = [
  SkillProficiency.BASIC,
  SkillProficiency.INTERMEDIATE,
  SkillProficiency.ADVANCED,
  SkillProficiency.EXPERT,
] as const;

const SUCCESS_METRIC_TIMEFRAME_VALUES = [
  SuccessMetricTimeframe.THREE_MONTHS,
  SuccessMetricTimeframe.TWELVE_MONTHS,
] as const;

const SCREENING_QUESTION_TYPE_VALUES = [
  ScreeningQuestionType.YES_NO,
  ScreeningQuestionType.SHORT_TEXT,
  ScreeningQuestionType.MULTIPLE_CHOICE,
  ScreeningQuestionType.NUMERIC,
] as const;

export class JobSkillDto {
  @RequiredString({ maxLength: 120 })
  name: string;

  @IsIn(SKILL_IMPORTANCE_VALUES)
  importance: SkillImportance;

  @IsIn(SKILL_PROFICIENCY_VALUES)
  proficiency: SkillProficiency;

  @OptionalInt({ min: 0, max: 60 })
  yearsExperience?: number;

  @OptionalString({ maxLength: 500 })
  evidenceRequired?: string;

  @IsInt()
  @Min(1)
  @Max(10)
  @IsOptional()
  weight?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;
}

export class JobSuccessMetricDto {
  @IsIn(SUCCESS_METRIC_TIMEFRAME_VALUES)
  timeframe: SuccessMetricTimeframe;

  @RequiredString({ maxLength: 500 })
  metric: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;
}

export class JobScreeningQuestionDto {
  @RequiredString({ maxLength: 500 })
  question: string;

  @IsIn(SCREENING_QUESTION_TYPE_VALUES)
  questionType: ScreeningQuestionType;

  @IsArray()
  @IsOptional()
  options?: string[];

  @OptionalString({ maxLength: 500 })
  disqualifyingAnswer?: string;

  @IsInt()
  @Min(1)
  @Max(10)
  @IsOptional()
  weight?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  sortOrder?: number;
}

export class UpdateJobWizardDto {
  // Step 1 — basics
  @OptionalString({ maxLength: 255 })
  title?: string;

  @OptionalString({ maxLength: 255 })
  normalizedTitle?: string;

  @OptionalString({ maxLength: 120 })
  industry?: string;

  @OptionalString({ maxLength: 120 })
  department?: string;

  @OptionalString({ maxLength: 60 })
  seniorityLevel?: string;

  @OptionalString({ maxLength: 255 })
  location?: string;

  @OptionalString({ maxLength: 50 })
  province?: string;

  @OptionalIn(EMPLOYMENT_TYPE_VALUES)
  employmentType?: EmploymentType;

  @OptionalIn(WORK_MODE_VALUES)
  workMode?: WorkMode;

  // Step 2 — outcomes
  @OptionalString({ maxLength: 2000 })
  companyContext?: string;

  @OptionalString({ maxLength: 1000 })
  mainPurpose?: string;

  @OptionalString({ maxLength: 8000 })
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JobSuccessMetricDto)
  @IsOptional()
  successMetrics?: JobSuccessMetricDto[];

  // Step 3 — skills + certifications
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JobSkillDto)
  @IsOptional()
  skills?: JobSkillDto[];

  @OptionalStringArray()
  requiredCertifications?: string[];

  @OptionalInt({ min: 0, max: 60 })
  minExperienceYears?: number;

  @OptionalString({ maxLength: 255 })
  requiredEducation?: string;

  // Step 4 — salary + benefits
  @OptionalInt({ min: 0 })
  salaryMin?: number;

  @OptionalInt({ min: 0 })
  salaryMax?: number;

  @OptionalString({ maxLength: 3 })
  salaryCurrency?: string;

  @OptionalString({ maxLength: 1000 })
  commissionStructure?: string;

  @OptionalStringArray()
  benefits?: string[];

  // Step 5 — screening
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JobScreeningQuestionDto)
  @IsOptional()
  screeningQuestions?: JobScreeningQuestionDto[];

  // Distribution
  @IsArray()
  @IsOptional()
  enabledPortalCodes?: string[];

  @OptionalInt({ min: 1, max: 90 })
  responseTimelineDays?: number;

  @OptionalEmail({ maxLength: 255 })
  applyByEmail?: string;
}
