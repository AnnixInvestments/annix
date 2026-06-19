import { ApiProperty } from "@nestjs/swagger";
export class PipeClampEntity {
  @ApiProperty({ description: "Primary key", example: 1 })
  id: number;

  @ApiProperty({ description: "Clamp type code", example: "THREE_BOLT" })
  clampType: string;

  @ApiProperty({
    description: "Clamp type description",
    example: "Three-Bolt Pipe Clamp",
  })
  clampDescription: string;

  @ApiProperty({ description: "NPS designation", example: '4"' })
  nps: string;

  @ApiProperty({ description: "Nominal bore (mm)", example: 100 })
  nbMm: number;

  @ApiProperty({ description: "Pipe OD range min (mm)", example: 114.3 })
  pipeOdMinMm: number;

  @ApiProperty({ description: "Pipe OD range max (mm)", example: 114.3 })
  pipeOdMaxMm: number;

  @ApiProperty({ description: "Bolt size designation", example: "M12" })
  boltSize: string;

  @ApiProperty({ description: "Number of bolts", example: 3 })
  boltCount: number;

  @ApiProperty({ description: "Bolt length (mm)", example: 75 })
  boltLengthMm: number;

  @ApiProperty({ description: "Clamp width (mm)", example: 50 })
  clampWidthMm: number | null;

  @ApiProperty({ description: "Clamp thickness (mm)", example: 6 })
  clampThicknessMm: number | null;

  @ApiProperty({ description: "Unit weight (kg)", example: 1.2 })
  unitWeightKg: number;

  @ApiProperty({ description: "Max load capacity (kg)", example: 1500 })
  maxLoadKg: number;

  @ApiProperty({ description: "Standard", example: "MSS-SP-58" })
  standard: string | null;

  createdAt: Date;
}
