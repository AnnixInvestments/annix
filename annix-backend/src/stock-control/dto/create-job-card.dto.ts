import { IsEnum, IsOptional, IsString } from "class-validator";
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
  @IsEnum(JobCardStatus)
  status?: JobCardStatus;
}
