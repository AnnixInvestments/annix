import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateIf,
} from "class-validator";

const HEX_COLOR = /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

export class UpdateOrbitBrandingDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Matches(HEX_COLOR, { message: "navbarColor must be a hex colour" })
  navbarColor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Matches(HEX_COLOR, { message: "accentOrange must be a hex colour" })
  accentOrange?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Matches(HEX_COLOR, { message: "accentOrangeLight must be a hex colour" })
  accentOrangeLight?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Matches(HEX_COLOR, { message: "accentOrangeDark must be a hex colour" })
  accentOrangeDark?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Matches(HEX_COLOR, { message: "gradientFrom must be a hex colour" })
  gradientFrom?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Matches(HEX_COLOR, { message: "gradientVia must be a hex colour" })
  gradientVia?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Matches(HEX_COLOR, { message: "gradientTo must be a hex colour" })
  gradientTo?: string;

  @ApiPropertyOptional({ description: "Storage key from an upload, or null to reset to default" })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  logoIconPath?: string | null;

  @ApiPropertyOptional({ description: "Storage key from an upload, or null to reset to default" })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  wordmarkPath?: string | null;

  @ApiPropertyOptional({ description: "Storage key from an upload, or null to reset to default" })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  faviconPath?: string | null;

  @ApiPropertyOptional({ description: "Storage key from an upload, or null to reset to default" })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  watermarkPath?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  watermarkEnabled?: boolean;

  @ApiPropertyOptional({ minimum: 0, maximum: 1 })
  @IsOptional()
  @Min(0)
  @Max(1)
  watermarkOpacity?: number;

  @ApiPropertyOptional({ minimum: 120, maximum: 2000 })
  @IsOptional()
  @IsInt()
  @Min(120)
  @Max(2000)
  watermarkMaxSizePx?: number;
}
