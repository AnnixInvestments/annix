import { IsBoolean, IsOptional, IsString } from "class-validator";

export class SetBrandingDto {
  @IsString()
  brandingType: string;

  @IsOptional()
  @IsString()
  websiteUrl?: string;

  @IsOptional()
  @IsBoolean()
  brandingAuthorized?: boolean;

  @IsOptional()
  @IsString()
  primaryColor?: string;

  @IsOptional()
  @IsString()
  accentColor?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  heroImageUrl?: string;
}
