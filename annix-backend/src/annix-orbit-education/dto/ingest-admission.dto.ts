import { IsInt, IsOptional, IsString, IsUrl, IsUUID, Max, Min } from "class-validator";

export class IngestAdmissionDto {
  @IsOptional()
  @IsUUID()
  institutionId?: string;

  @IsOptional()
  @IsUUID()
  programmeId?: string;

  @IsInt()
  @Min(2024)
  @Max(2100)
  intakeYear: number;

  @IsString()
  @IsUrl({ require_protocol: true })
  sourceUrl: string;
}
