import { ApiProperty } from "@nestjs/swagger";
export class MaterialMechanicalProperty {
  @ApiProperty({ description: "Primary key", example: 1 })
  id: number;

  @ApiProperty({ description: "Specification code", example: "ASTM_A106" })
  specificationCode: string;

  @ApiProperty({ description: "Material grade", example: "B" })
  grade: string;

  @ApiProperty({ description: "UNS number", example: "K03006" })
  unsNumber: string | null;

  @ApiProperty({ description: "ASME P-number", example: "1" })
  pNumber: string | null;

  @ApiProperty({ description: "ASME Group number", example: "2" })
  groupNumber: string | null;

  @ApiProperty({ description: "Minimum yield strength MPa", example: 240 })
  smysMpa: number | null;

  @ApiProperty({ description: "Minimum tensile strength MPa", example: 415 })
  smtsMpa: number | null;

  @ApiProperty({ description: "Minimum elongation %", example: 21 })
  elongationPctMin: number | null;

  @ApiProperty({ description: "Maximum carbon equivalent (IIW)", example: 0.43 })
  carbonEquivalentMax: number | null;

  @ApiProperty({ description: "CE formula type", example: "IIW" })
  ceFormula: string | null;

  @ApiProperty({ description: "Impact test temperature C", example: -29 })
  impactTestTempC: number | null;

  @ApiProperty({ description: "Minimum impact energy J", example: 27 })
  minImpactJ: number | null;

  @ApiProperty({ description: "Maximum hardness HRC", example: 22 })
  hardnessMaxHrc: number | null;

  @ApiProperty({ description: "Maximum hardness HV", example: 248 })
  hardnessMaxHv: number | null;

  @ApiProperty({ description: "Applicable standards" })
  applicableStandards: string | null;

  @ApiProperty({ description: "Additional notes" })
  notes: string | null;

  createdAt: Date;

  updatedAt: Date;
}
