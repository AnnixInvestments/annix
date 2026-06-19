import { ApiProperty } from "@nestjs/swagger";
export class ImpactTestResult {
  @ApiProperty({ description: "Primary key", example: 1 })
  id: number;

  @ApiProperty({ description: "Heat number", example: "H12345" })
  heatNumber: string | null;

  @ApiProperty({ description: "MTC reference number", example: "MTC-2024-001" })
  mtcReference: string | null;

  @ApiProperty({ description: "Test temperature C", example: -29 })
  testTempC: number;

  @ApiProperty({ description: "Specimen size", example: "10x10" })
  specimenSize: string | null;

  @ApiProperty({ description: "Specimen orientation", example: "T" })
  specimenOrientation: string | null;

  @ApiProperty({ description: "Impact value 1 in Joules", example: 45 })
  impactValue1J: number;

  @ApiProperty({ description: "Impact value 2 in Joules", example: 48 })
  impactValue2J: number;

  @ApiProperty({ description: "Impact value 3 in Joules", example: 42 })
  impactValue3J: number;

  @ApiProperty({ description: "Average impact value in Joules", example: 45 })
  impactAverageJ: number;

  @ApiProperty({ description: "Minimum required average J", example: 27 })
  requiredAvgJ: number | null;

  @ApiProperty({ description: "Minimum required single J", example: 20 })
  requiredMinJ: number | null;

  @ApiProperty({ description: "Test result passed", example: true })
  passed: boolean;

  @ApiProperty({ description: "RFQ item ID reference" })
  rfqItemId: number | null;

  createdAt: Date;

  updatedAt: Date;
}
