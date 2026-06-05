import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from "class-validator";
import { INHERITABLE_SCALAR_FIELDS } from "../branding.constants";

const HEX_COLOR = /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

export class UpdateBrandingDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Matches(HEX_COLOR, { message: "navbarColor must be a hex colour" })
  navbarColor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Matches(HEX_COLOR, { message: "navbarColorLight must be a hex colour" })
  navbarColorLight?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Matches(HEX_COLOR, { message: "backgroundLight must be a hex colour" })
  backgroundLight?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Matches(HEX_COLOR, { message: "backgroundDark must be a hex colour" })
  backgroundDark?: string;

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  tagline?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ description: "Pillar tagline, e.g. QUOTE · BUILD · INSPECT · DELIVER" })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  heroWords?: string;

  @ApiPropertyOptional({ description: "Display font family (e.g. Orbitron)" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  fontDisplay?: string;

  @ApiPropertyOptional({ description: "Headings font family (e.g. Exo 2)" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  fontHeadings?: string;

  @ApiPropertyOptional({ description: "Body font family (e.g. Inter)" })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  fontBody?: string;

  @ApiPropertyOptional({ description: "Storage key from an upload, or null to reset to default" })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  logoIconPath?: string | null;

  @ApiPropertyOptional({ description: "Storage key from an upload, or null to reset to default" })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  logoLockupPath?: string | null;

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

  @ApiPropertyOptional({ description: "Storage key from an upload, or null to reset to default" })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  textCropPath?: string | null;

  @ApiPropertyOptional({ description: "Storage key from an upload, or null to reset to default" })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  subMarkPath?: string | null;

  @ApiPropertyOptional({ description: "Storage key from an upload, or null to reset to default" })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  flashLinePath?: string | null;

  @ApiPropertyOptional({ description: "Storage key from an upload, or null to reset to default" })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  heroImagePath?: string | null;

  @ApiPropertyOptional({ description: "Storage key from an upload, or null to reset to default" })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  logoIconPathDark?: string | null;

  @ApiPropertyOptional({ description: "Storage key from an upload, or null to reset to default" })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  logoLockupPathDark?: string | null;

  @ApiPropertyOptional({ description: "Storage key from an upload, or null to reset to default" })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  wordmarkPathDark?: string | null;

  @ApiPropertyOptional({ description: "Storage key from an upload, or null to reset to default" })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  faviconPathDark?: string | null;

  @ApiPropertyOptional({ description: "Storage key from an upload, or null to reset to default" })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  watermarkPathDark?: string | null;

  @ApiPropertyOptional({ description: "Storage key from an upload, or null to reset to default" })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  textCropPathDark?: string | null;

  @ApiPropertyOptional({ description: "Storage key from an upload, or null to reset to default" })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  subMarkPathDark?: string | null;

  @ApiPropertyOptional({ description: "Storage key from an upload, or null to reset to default" })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  flashLinePathDark?: string | null;

  @ApiPropertyOptional({ description: "Storage key from an upload, or null to reset to default" })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  heroImagePathDark?: string | null;

  @ApiPropertyOptional({ description: "Storage key from an upload, or null to reset to default" })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  loginCardPath?: string | null;

  @ApiPropertyOptional({ description: "Storage key from an upload, or null to reset to default" })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  loginCardPathDark?: string | null;

  @ApiPropertyOptional({ description: "Storage key from an upload, or null to reset to default" })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  pageBackgroundPath?: string | null;

  @ApiPropertyOptional({ description: "Storage key from an upload, or null to reset to default" })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  pageBackgroundPathDark?: string | null;

  @ApiPropertyOptional({ description: "Storage key from an upload, or null to reset to default" })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  heroTopPath?: string | null;

  @ApiPropertyOptional({ description: "Storage key from an upload, or null to reset to default" })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  heroTopPathDark?: string | null;

  @ApiPropertyOptional({ description: "Storage key from an upload, or null to reset to default" })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  heroBottomPath?: string | null;

  @ApiPropertyOptional({ description: "Storage key from an upload, or null to reset to default" })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  heroBottomPathDark?: string | null;

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

  @ApiPropertyOptional({ enum: ["pulse", "spin", "bounce", "glow", "float"] })
  @IsOptional()
  @IsIn(["pulse", "spin", "bounce", "glow", "float"])
  loadingAnimation?: string;

  @ApiPropertyOptional({ minimum: 5, maximum: 100, description: "Top hero height as % of screen" })
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(100)
  heroTopHeightPct?: number;

  @ApiPropertyOptional({
    minimum: 5,
    maximum: 100,
    description: "Bottom hero height as % of screen",
  })
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(100)
  heroBottomHeightPct?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 100, description: "Top hero edge-fade amount" })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  heroTopFadePct?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: 100, description: "Bottom hero edge-fade amount" })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  heroBottomFadePct?: number;

  @ApiPropertyOptional({
    description: "Scalar fields this brand inherits from the master (Annix Investments) brand",
    isArray: true,
    enum: INHERITABLE_SCALAR_FIELDS,
  })
  @IsOptional()
  @IsArray()
  @IsIn(INHERITABLE_SCALAR_FIELDS, { each: true })
  inheritedFields?: string[];
}
