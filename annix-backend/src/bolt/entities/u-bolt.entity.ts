import { ApiProperty } from "@nestjs/swagger";
export class UBoltEntity {
  @ApiProperty({ description: "Primary key", example: 1 })
  id: number;

  @ApiProperty({ description: "NPS designation", example: '4"' })
  nps: string;

  @ApiProperty({ description: "Nominal bore (mm)", example: 100 })
  nbMm: number;

  @ApiProperty({ description: "Pipe OD range min (mm)", example: 114.3 })
  pipeOdMinMm: number;

  @ApiProperty({ description: "Pipe OD range max (mm)", example: 114.3 })
  pipeOdMaxMm: number;

  @ApiProperty({ description: "Thread size designation", example: "M12" })
  threadSize: string;

  @ApiProperty({ description: "Thread diameter (mm)", example: 12 })
  threadDiameterMm: number;

  @ApiProperty({ description: "Inside width at crown (mm)", example: 127 })
  insideWidthMm: number;

  @ApiProperty({ description: "Leg length (mm)", example: 125 })
  legLengthMm: number;

  @ApiProperty({ description: "Thread length per leg (mm)", example: 40 })
  threadLengthMm: number;

  @ApiProperty({ description: "Rod diameter (mm)", example: 12 })
  rodDiameterMm: number;

  @ApiProperty({ description: "Unit weight (kg)", example: 0.35 })
  unitWeightKg: number;

  @ApiProperty({
    description: "Standard (e.g., DIN 3570)",
    example: "DIN 3570",
  })
  standard: string | null;

  @ApiProperty({ description: "Material grade", example: "4.6" })
  materialGrade: string | null;

  createdAt: Date;
}
