import { ApiProperty } from "@nestjs/swagger";
import { BracketTypeEntity } from "./bracket-type.entity";

export class BracketDimensionBySizeEntity {
  @ApiProperty({ description: "Primary key", example: 1 })
  id: number;

  @ApiProperty({ description: "Bracket type code", example: "CLEVIS_HANGER" })
  bracketTypeCode: string;

  bracketType: BracketTypeEntity;

  @ApiProperty({ description: "NPS designation", example: '4"' })
  nps: string;

  @ApiProperty({ description: "Nominal bore (mm)", example: 100 })
  nbMm: number;

  @ApiProperty({ description: "Dimension A (mm)", example: 108 })
  dimensionAMm: number | null;

  @ApiProperty({ description: "Dimension B (mm)", example: 156 })
  dimensionBMm: number | null;

  @ApiProperty({ description: "Rod diameter (mm)", example: 12 })
  rodDiameterMm: number | null;

  @ApiProperty({ description: "Unit weight (kg)", example: 0.82 })
  unitWeightKg: number;

  @ApiProperty({ description: "Maximum load capacity (kg)", example: 900 })
  maxLoadKg: number;

  createdAt: Date;
}
