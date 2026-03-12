import { IsBoolean, IsOptional, IsString } from "class-validator";

export class ComplySaUpdatePreferencesDto {
  @IsBoolean()
  @IsOptional()
  emailEnabled?: boolean;

  @IsBoolean()
  @IsOptional()
  smsEnabled?: boolean;

  @IsBoolean()
  @IsOptional()
  whatsappEnabled?: boolean;

  @IsBoolean()
  @IsOptional()
  inAppEnabled?: boolean;

  @IsBoolean()
  @IsOptional()
  weeklyDigest?: boolean;

  @IsString()
  @IsOptional()
  phone?: string | null;
}
