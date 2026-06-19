import { ApiProperty } from "@nestjs/swagger";
export class HydrotestRequirement {
  @ApiProperty({ description: "Primary key", example: 1 })
  id: number;

  @ApiProperty({ description: "Code reference", example: "ASME_B31.3" })
  code: string;

  @ApiProperty({ description: "Code display name", example: "ASME B31.3 Process Piping" })
  codeDisplayName: string;

  @ApiProperty({ description: "Test pressure multiplier of design pressure", example: 1.5 })
  testPressureMultiplier: number;

  @ApiProperty({
    description: "Test pressure formula description",
    example: "1.5 x Design Pressure",
  })
  testPressureFormula: string;

  @ApiProperty({ description: "Minimum hold time in minutes", example: 10 })
  holdTimeMinutes: number;

  @ApiProperty({ description: "Hold time per mm of wall thickness (minutes)", example: 0 })
  holdTimePerMmWall: number | null;

  @ApiProperty({ description: "Maximum allowable volume loss percentage", example: 1.5 })
  volumeLossMaxPct: number;

  @ApiProperty({ description: "Minimum test temperature in Celsius", example: 16 })
  temperatureMinC: number;

  @ApiProperty({ description: "Test medium options", example: "WATER" })
  medium: string;

  @ApiProperty({ description: "Pneumatic test allowed", example: false })
  pneumaticAllowed: boolean;

  @ApiProperty({ description: "Pneumatic test pressure multiplier if allowed", example: 1.1 })
  pneumaticMultiplier: number | null;

  @ApiProperty({ description: "Additional notes" })
  notes: string | null;

  createdAt: Date;

  updatedAt: Date;
}
