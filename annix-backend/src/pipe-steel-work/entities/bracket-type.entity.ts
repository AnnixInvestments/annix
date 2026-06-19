import { ApiProperty } from "@nestjs/swagger";
export class BracketTypeEntity {
  @ApiProperty({ description: "Primary key", example: 1 })
  id: number;

  @ApiProperty({ description: "Bracket type code", example: "CLEVIS_HANGER" })
  typeCode: string;

  @ApiProperty({ description: "Display name", example: "Clevis Hanger" })
  displayName: string;

  @ApiProperty({ description: "Description of bracket use" })
  description?: string;

  @ApiProperty({ description: "Minimum NB size supported (mm)" })
  minNbMm: number;

  @ApiProperty({ description: "Maximum NB size supported (mm)" })
  maxNbMm: number;

  @ApiProperty({ description: "Weight factor per meter of support" })
  weightFactor: number;

  @ApiProperty({ description: "Base material cost per unit (Rand)" })
  baseCostPerUnit?: number;

  @ApiProperty({ description: "Suitable for insulated pipes" })
  insulatedSuitable: boolean;

  @ApiProperty({ description: "Allows thermal expansion" })
  allowsExpansion: boolean;

  @ApiProperty({ description: "Fixed/anchor point type" })
  isAnchorType: boolean;

  @ApiProperty({ description: "Dimension A (mm) - typically clevis width" })
  dimensionAMm: number | null;

  @ApiProperty({ description: "Dimension B (mm) - typically clevis height" })
  dimensionBMm: number | null;

  @ApiProperty({ description: "Rod diameter (mm)" })
  rodDiameterMm: number | null;

  @ApiProperty({ description: "Width (mm)" })
  widthMm: number | null;

  @ApiProperty({ description: "Thickness (mm)" })
  thicknessMm: number | null;

  @ApiProperty({ description: "Length (mm)" })
  lengthMm: number | null;

  @ApiProperty({ description: "Brace length (mm)" })
  braceLengthMm: number | null;

  @ApiProperty({ description: "Base width (mm)" })
  baseWidthMm: number | null;

  @ApiProperty({ description: "Base length (mm)" })
  baseLengthMm: number | null;

  @ApiProperty({ description: "Height (mm)" })
  heightMm: number | null;

  @ApiProperty({ description: "Typical weight per unit (kg)" })
  weightKgPerUnit: number | null;

  @ApiProperty({ description: "Maximum load capacity (kg)" })
  maxLoadKg: number | null;

  createdAt: Date;

  updatedAt: Date;
}
