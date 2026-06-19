import { ApiProperty } from "@nestjs/swagger";
export type PslLevel = "PSL1" | "PSL2";

export class Api5lGrade {
  @ApiProperty({ description: "Primary key", example: 1 })
  id: number;

  @ApiProperty({ description: "API 5L grade designation", example: "X65" })
  grade: string;

  @ApiProperty({ description: "Product Specification Level", example: "PSL2" })
  pslLevel: PslLevel;

  @ApiProperty({ description: "Specified Minimum Yield Strength in MPa", example: 450 })
  smysMpa: number;

  @ApiProperty({ description: "Specified Minimum Tensile Strength in MPa", example: 535 })
  smtsMpa: number;

  @ApiProperty({ description: "Minimum elongation percentage", example: 18 })
  elongationPctMin: number;

  @ApiProperty({ description: "CVN test temperature in Celsius (PSL2)", example: 0 })
  cvnTempC: number | null;

  @ApiProperty({ description: "CVN average energy in Joules (PSL2)", example: 27 })
  cvnAvgJ: number | null;

  @ApiProperty({ description: "CVN minimum single value in Joules (PSL2)", example: 20 })
  cvnMinJ: number | null;

  @ApiProperty({ description: "Maximum carbon content percentage", example: 0.18 })
  carbonMaxPct: number;

  @ApiProperty({ description: "Maximum manganese content percentage", example: 1.4 })
  manganeseMaxPct: number;

  @ApiProperty({ description: "Maximum phosphorus content percentage", example: 0.015 })
  phosphorusMaxPct: number;

  @ApiProperty({ description: "Maximum sulfur content percentage", example: 0.015 })
  sulfurMaxPct: number;

  @ApiProperty({ description: "Maximum carbon equivalent (Ceq)", example: 0.43 })
  ceqMax: number | null;

  @ApiProperty({ description: "NDT coverage percentage required", example: 100 })
  ndtCoveragePct: number;

  @ApiProperty({ description: "Heat number traceability required", example: true })
  heatTraceabilityRequired: boolean;

  @ApiProperty({ description: "Additional notes" })
  notes: string | null;

  createdAt: Date;

  updatedAt: Date;
}
