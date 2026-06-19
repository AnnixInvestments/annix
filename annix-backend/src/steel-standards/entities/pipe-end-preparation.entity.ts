import { ApiProperty } from "@nestjs/swagger";
export class PipeEndPreparation {
  @ApiProperty({ description: "Primary key", example: 1 })
  id: number;

  @ApiProperty({ description: "Preparation type code", example: "V_BEVEL" })
  prepType: string;

  @ApiProperty({ description: "Display name", example: "V-Bevel (Standard)" })
  displayName: string;

  @ApiProperty({ description: "Bevel angle in degrees", example: 37.5 })
  bevelAngleDeg: number;

  @ApiProperty({ description: "Bevel angle tolerance in degrees (+/-)", example: 2.5 })
  bevelAngleTolDeg: number;

  @ApiProperty({ description: "Secondary bevel angle for compound bevels", example: 10 })
  secondaryAngleDeg: number | null;

  @ApiProperty({ description: "Root face dimension in mm", example: 1.6 })
  rootFaceMm: number;

  @ApiProperty({ description: "Root face tolerance in mm (+/-)", example: 0.8 })
  rootFaceTolMm: number;

  @ApiProperty({ description: "Minimum root gap in mm", example: 1.6 })
  rootGapMmMin: number;

  @ApiProperty({ description: "Maximum root gap in mm", example: 3.2 })
  rootGapMmMax: number;

  @ApiProperty({ description: "Land dimension for J/U preps in mm", example: 3.2 })
  landMm: number | null;

  @ApiProperty({ description: "Minimum applicable wall thickness in mm", example: 0 })
  wallThicknessMinMm: number;

  @ApiProperty({ description: "Maximum applicable wall thickness in mm", example: 999 })
  wallThicknessMaxMm: number;

  @ApiProperty({ description: "Applicable welding codes", example: "B31.3, API 1104" })
  applicableCodes: string | null;

  @ApiProperty({ description: "Additional notes" })
  notes: string | null;

  createdAt: Date;

  updatedAt: Date;
}
