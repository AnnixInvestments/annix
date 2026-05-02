import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import { CandidateStatus } from "../entities/candidate.entity";

export class UpdateCandidateStatusDto {
  @IsEnum(CandidateStatus)
  status: CandidateStatus;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  reason?: string;
}

export class SubmitReferenceFeedbackDto {
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsString()
  @IsOptional()
  feedbackText?: string;
}

export class CreateCandidateDto {
  @IsInt()
  jobPostingId: number;

  @IsString()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  name?: string;

  @IsBoolean()
  @IsOptional()
  popiaConsent?: boolean;
}

export class UpdateCandidateProfileDto {
  @IsInt()
  @Min(1)
  @Max(8)
  @IsOptional()
  beeLevel?: number | null;

  @IsBoolean()
  @IsOptional()
  popiaConsent?: boolean;

  @IsBoolean()
  @IsOptional()
  jobAlertsOptIn?: boolean;
}
