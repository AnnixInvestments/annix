import { ApiProperty } from "@nestjs/swagger";
export class PipeSupportSpacing {
  @ApiProperty({ description: "Primary key", example: 1 })
  id: number;

  @ApiProperty({ description: "Nominal bore in mm", example: 50 })
  nbMm: number;

  @ApiProperty({ description: "Nominal pipe size in inches", example: '2"' })
  nps: string;

  @ApiProperty({ description: "Standard pipe schedule", example: "Std" })
  schedule: string;

  @ApiProperty({ description: "Maximum span for water-filled pipe (m)" })
  waterFilledSpanM: number;

  @ApiProperty({ description: "Maximum span for vapor/gas pipe (m)" })
  vaporGasSpanM: number;

  @ApiProperty({ description: "Rod size for hanger (mm)" })
  rodSizeMm?: number;

  createdAt: Date;

  updatedAt: Date;
}
