import { ApiProperty } from "@nestjs/swagger";
export class NdtMethodRequirement {
  @ApiProperty({ description: "Primary key", example: 1 })
  id: number;

  @ApiProperty({ description: "NDT method code", example: "RT" })
  method: string;

  @ApiProperty({ description: "Method display name", example: "Radiographic Testing" })
  methodDisplayName: string;

  @ApiProperty({ description: "ASTM standard reference", example: "ASTM E142" })
  astmStandard: string;

  @ApiProperty({ description: "Application type", example: "BUTT_WELD" })
  application: string;

  @ApiProperty({ description: "Application display name", example: "Butt Welds" })
  applicationDisplayName: string;

  @ApiProperty({ description: "PSL1 coverage percentage", example: 10 })
  coveragePsl1Pct: number;

  @ApiProperty({ description: "PSL2 coverage percentage", example: 100 })
  coveragePsl2Pct: number;

  @ApiProperty({ description: "Acceptance criteria reference", example: "API 1104 Section 9" })
  acceptanceCriteriaRef: string;

  @ApiProperty({ description: "Equipment requirements", example: "Industrial X-ray, IQI" })
  equipmentRequirements: string | null;

  @ApiProperty({ description: "Minimum operator certification level", example: "Level II" })
  operatorCertLevel: string;

  @ApiProperty({
    description: "Defect types detected",
    example: "Porosity, Slag, Cracks, Incomplete Fusion",
  })
  defectsDetected: string | null;

  @ApiProperty({ description: "Additional notes" })
  notes: string | null;

  createdAt: Date;

  updatedAt: Date;
}
