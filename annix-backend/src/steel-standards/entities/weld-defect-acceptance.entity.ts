import { ApiProperty } from "@nestjs/swagger";
export class WeldDefectAcceptance {
  @ApiProperty({ description: "Primary key", example: 1 })
  id: number;

  @ApiProperty({ description: "Welding code reference", example: "API_1104" })
  code: string;

  @ApiProperty({ description: "Code display name", example: "API 1104" })
  codeDisplayName: string;

  @ApiProperty({ description: "Defect type", example: "UNDERCUT" })
  defectType: string;

  @ApiProperty({ description: "Defect display name", example: "Undercut" })
  defectDisplayName: string;

  @ApiProperty({ description: "Maximum dimension in mm", example: 0.8 })
  maxDimensionMm: number | null;

  @ApiProperty({ description: "Maximum dimension as percentage of wall thickness", example: 10 })
  maxDimensionPctT: number | null;

  @ApiProperty({
    description: "Spacing requirement description",
    example: "6x diameter minimum spacing",
  })
  spacingRequirement: string | null;

  @ApiProperty({
    description: "Cumulative limit description",
    example: "Train <=25% circumference",
  })
  cumulativeLimit: string | null;

  @ApiProperty({ description: "Maximum repairs allowed per joint", example: 2 })
  repairLimit: number | null;

  @ApiProperty({ description: "Whether this defect is permitted at all", example: true })
  permitted: boolean;

  @ApiProperty({ description: "Additional notes" })
  notes: string | null;

  createdAt: Date;

  updatedAt: Date;
}
