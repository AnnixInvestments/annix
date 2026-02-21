import { IsEnum, IsObject, IsOptional, IsString } from "class-validator";
import { JobCardStatus } from "../entities/job-card.entity";

export class CreateJobCardDto {
  @IsString()
  jobNumber: string;

  @IsString()
  jobName: string;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  poNumber?: string;

  @IsOptional()
  @IsString()
  siteLocation?: string;

  @IsOptional()
  @IsString()
  contactPerson?: string;

  @IsOptional()
  @IsString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsObject()
  customFields?: Record<string, string>;

  @IsOptional()
  @IsEnum(JobCardStatus)
  status?: JobCardStatus;
}
