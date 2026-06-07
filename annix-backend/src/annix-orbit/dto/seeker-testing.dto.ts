import { IsInt, IsOptional, IsString } from "class-validator";

export class CreateSeekerTestPhaseDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsInt()
  targetUsers?: number;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateSeekerTestPhaseDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsInt()
  targetUsers?: number;

  @IsOptional()
  @IsInt()
  actualUsers?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsInt()
  readinessPercentage?: number;
}

export class CreateSeekerTestingIssueDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  severity?: string;

  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  workflowStep?: string;

  @IsOptional()
  @IsInt()
  userId?: number;

  @IsOptional()
  @IsString()
  phaseId?: string;

  @IsOptional()
  @IsString()
  screenshotUrl?: string;
}

export class UpdateSeekerTestingIssueDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  severity?: string;
}
