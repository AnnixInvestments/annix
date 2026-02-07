import { ApiProperty } from "@nestjs/swagger";

export class PumpCalculationResultDto {
  @ApiProperty({ description: "Hydraulic power required in kW" })
  hydraulicPowerKw: number;

  @ApiProperty({ description: "Estimated motor power required in kW" })
  estimatedMotorPowerKw: number;

  @ApiProperty({ description: "Pump efficiency estimate (%)" })
  estimatedEfficiency: number;

  @ApiProperty({ description: "Specific speed (Ns)" })
  specificSpeed: number;

  @ApiProperty({ description: "Recommended pump type based on specific speed" })
  recommendedPumpType: string;

  @ApiProperty({ description: "NPSHr estimate in meters" })
  npshRequired: number;

  @ApiProperty({ description: "Best Efficiency Point (BEP) flow rate in m³/h" })
  bepFlowRate: number;

  @ApiProperty({ description: "Best Efficiency Point (BEP) head in meters" })
  bepHead: number;

  @ApiProperty({ description: "Operating point as percentage of BEP" })
  operatingPointPercentBep: number;

  @ApiProperty({
    description: "Warnings about the pump selection",
    type: [String],
  })
  warnings: string[];

  @ApiProperty({
    description: "Recommendations for the pump selection",
    type: [String],
  })
  recommendations: string[];
}
