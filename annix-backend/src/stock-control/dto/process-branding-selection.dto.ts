import { IsOptional, IsString } from "class-validator";

export class ProcessBrandingSelectionDto {
  @IsOptional()
  @IsString()
  logoSourceUrl?: string;

  @IsOptional()
  @IsString()
  heroSourceUrl?: string;

  @IsOptional()
  @IsString()
  scrapedPrimaryColor?: string;
}
