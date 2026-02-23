import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class UpdateImapSettingsDto {
  @IsString()
  @IsOptional()
  imapHost?: string;

  @IsInt()
  @Min(1)
  @Max(65535)
  @IsOptional()
  imapPort?: number;

  @IsString()
  @IsOptional()
  imapUser?: string;

  @IsString()
  @IsOptional()
  imapPassword?: string;

  @IsBoolean()
  @IsOptional()
  monitoringEnabled?: boolean;

  @IsString()
  @IsOptional()
  emailFromAddress?: string;
}

export class UpdateCompanyDto {
  @IsString()
  @IsOptional()
  name?: string;
}
