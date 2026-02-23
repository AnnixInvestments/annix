import { IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class UpdateCandidateStatusDto {
  @IsString()
  status: string;
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
}
