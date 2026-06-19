import { ApiProperty } from "@nestjs/swagger";
export class WeldingRequirement {
  @ApiProperty({ description: "Primary key", example: 1 })
  id: number;

  @ApiProperty({ description: "ASME P-Number (e.g., 1, 5A, 5B, 15E)", example: "1" })
  pNumber: string;

  @ApiProperty({ description: "Group number within P-Number", example: "1" })
  groupNumber?: string;

  @ApiProperty({ description: "Material description", example: "Carbon Steel" })
  materialDescription: string;

  @ApiProperty({ description: "Typical specifications", example: "A106 Gr.B, A53 Gr.B" })
  typicalSpecifications?: string;

  @ApiProperty({ description: "Minimum preheat temperature in Celsius", example: 10 })
  preheatMinC?: number;

  @ApiProperty({ description: "Maximum interpass temperature in Celsius", example: 315 })
  interpassMaxC?: number;

  @ApiProperty({ description: "Whether PWHT is required", example: true })
  pwhtRequired: boolean;

  @ApiProperty({ description: "PWHT temperature minimum in Celsius", example: 595 })
  pwhtTempMinC?: number;

  @ApiProperty({ description: "PWHT temperature maximum in Celsius", example: 650 })
  pwhtTempMaxC?: number;

  @ApiProperty({ description: "PWHT hold time in hours per inch of thickness", example: 1 })
  pwhtHoldHrsPerInch?: number;

  @ApiProperty({ description: "Minimum PWHT hold time in hours", example: 0.25 })
  pwhtMinHoldHrs?: number;

  @ApiProperty({ description: "Maximum heating rate in °C/hour", example: 220 })
  heatingRateMaxCPerHr?: number;

  @ApiProperty({ description: "Maximum cooling rate in °C/hour", example: 280 })
  coolingRateMaxCPerHr?: number;

  @ApiProperty({ description: "Thickness threshold for mandatory PWHT in mm", example: 19 })
  pwhtThicknessThresholdMm?: number;

  @ApiProperty({ description: "Recommended filler metal AWS classification", example: "E7018" })
  recommendedFillerMetal?: string;

  @ApiProperty({ description: "Additional notes or requirements", required: false })
  notes?: string;

  createdAt: Date;

  updatedAt: Date;
}
