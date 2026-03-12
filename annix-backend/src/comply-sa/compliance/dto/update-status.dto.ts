import { IsOptional, IsString } from "class-validator";

export class ComplySaUpdateStatusDto {
  @IsString()
  @IsOptional()
  status: string | null = null;

  @IsString()
  @IsOptional()
  notes: string | null = null;

  @IsString()
  @IsOptional()
  lastCompletedDate: string | null = null;
}
