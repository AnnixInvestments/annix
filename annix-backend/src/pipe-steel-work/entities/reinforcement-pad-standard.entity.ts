import { ApiProperty } from "@nestjs/swagger";
export class ReinforcementPadStandardEntity {
  @ApiProperty({ description: "Primary key", example: 1 })
  id: number;

  @ApiProperty({ description: "Branch NPS designation", example: '4"' })
  branchNps: string;

  @ApiProperty({ description: "Branch nominal bore (mm)", example: 100 })
  branchNbMm: number;

  @ApiProperty({ description: "Header NPS designation", example: '8"' })
  headerNps: string;

  @ApiProperty({ description: "Header nominal bore (mm)", example: 200 })
  headerNbMm: number;

  @ApiProperty({ description: "Minimum pad width (mm)", example: 76 })
  minPadWidthMm: number;

  @ApiProperty({ description: "Minimum pad thickness (mm)", example: 9.5 })
  minPadThicknessMm: number;

  @ApiProperty({ description: "Typical weight (kg)", example: 1.9 })
  typicalWeightKg: number;

  @ApiProperty({ description: "Notes", required: false })
  notes: string | null;

  createdAt: Date;

  updatedAt: Date;
}
