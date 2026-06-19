import { ApiProperty } from "@nestjs/swagger";
export class HardnessTestResult {
  @ApiProperty({ description: "Primary key", example: 1 })
  id: number;

  @ApiProperty({ description: "Heat number", example: "H12345" })
  heatNumber: string | null;

  @ApiProperty({ description: "MTC reference number", example: "MTC-2024-001" })
  mtcReference: string | null;

  @ApiProperty({ description: "Test location", example: "base_metal" })
  testLocation: string | null;

  @ApiProperty({ description: "Hardness value HRC", example: 18 })
  hardnessHrc: number | null;

  @ApiProperty({ description: "Hardness value HV", example: 220 })
  hardnessHv: number | null;

  @ApiProperty({ description: "Hardness value HB", example: 200 })
  hardnessHb: number | null;

  @ApiProperty({ description: "Maximum allowed HRC", example: 22 })
  maxAllowedHrc: number | null;

  @ApiProperty({ description: "Maximum allowed HV", example: 248 })
  maxAllowedHv: number | null;

  @ApiProperty({ description: "Test result passed", example: true })
  passed: boolean;

  @ApiProperty({ description: "RFQ item ID reference" })
  rfqItemId: number | null;

  createdAt: Date;

  updatedAt: Date;
}
