import { ApiProperty } from "@nestjs/swagger";
export class PipeTolerance {
  @ApiProperty({ description: "Primary key", example: 1 })
  id: number;

  @ApiProperty({ description: "Standard reference", example: "ASME B36.10M" })
  standard: string;

  @ApiProperty({ description: "Minimum NPS in mm for this tolerance range", example: 25 })
  npsMinMm: number;

  @ApiProperty({ description: "Maximum NPS in mm for this tolerance range", example: 450 })
  npsMaxMm: number;

  @ApiProperty({ description: "OD tolerance percentage (+/-)", example: 0.4 })
  odTolerancePct: number;

  @ApiProperty({ description: "Maximum OD tolerance in mm", example: 12.5 })
  odToleranceMmMax: number | null;

  @ApiProperty({ description: "Wall thickness under tolerance percentage", example: 12.5 })
  wallTolerancePctUnder: number;

  @ApiProperty({ description: "Wall thickness over tolerance percentage", example: 0 })
  wallTolerancePctOver: number | null;

  @ApiProperty({ description: "SRL length plus tolerance in mm", example: 152.4 })
  lengthSrlPlusMm: number;

  @ApiProperty({ description: "SRL length minus tolerance in mm", example: 0 })
  lengthSrlMinusMm: number;

  @ApiProperty({ description: "DRL length plus tolerance in mm", example: 76.2 })
  lengthDrlPlusMm: number;

  @ApiProperty({ description: "DRL length minus tolerance in mm", example: 0 })
  lengthDrlMinusMm: number;

  @ApiProperty({
    description: "Straightness tolerance ratio (e.g., 2000 for 1/2000)",
    example: 2000,
  })
  straightnessRatio: number;

  @ApiProperty({ description: "Weight tolerance percentage (+/-)", example: 3.5 })
  weightTolerancePct: number;

  @ApiProperty({ description: "Additional notes" })
  notes: string | null;

  createdAt: Date;

  updatedAt: Date;
}
