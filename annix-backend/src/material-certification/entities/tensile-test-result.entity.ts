import { ApiProperty } from "@nestjs/swagger";
import { RfqItem } from "../../rfq/entities/rfq-item.entity";

export class TensileTestResult {
  @ApiProperty({ description: "Primary key", example: 1 })
  id: number;

  @ApiProperty({ description: "Yield strength in MPa", example: 245 })
  yieldMpa?: number;

  @ApiProperty({ description: "Ultimate tensile strength in MPa", example: 415 })
  ultimateMpa?: number;

  @ApiProperty({ description: "Elongation percentage", example: 22 })
  elongationPct?: number;

  @ApiProperty({ description: "Reduction of area percentage", example: 50 })
  reductionOfAreaPct?: number;

  @ApiProperty({ description: "Test temperature in Celsius", example: 20 })
  testTemperatureC?: number;

  @ApiProperty({ description: "Specimen orientation (L=Longitudinal, T=Transverse)", example: "L" })
  specimenOrientation?: string;

  @ApiProperty({ description: "Specimen location (Base, Weld, HAZ)", example: "Base" })
  specimenLocation?: string;

  @ApiProperty({ description: "Heat number reference", required: false })
  heatNumber?: string;

  @ApiProperty({ description: "MTC reference number", required: false })
  mtcReference?: string;

  rfqItem?: RfqItem;

  rfqItemId?: number;

  createdAt: Date;

  updatedAt: Date;
}
