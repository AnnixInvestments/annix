import { ApiProperty } from "@nestjs/swagger";
export class ForgedFittingClassRating {
  @ApiProperty({ description: "Primary key", example: 1 })
  id: number;

  @ApiProperty({ description: "Standard reference", example: "ASME B16.11" })
  standard: string;

  @ApiProperty({ description: "Fitting pressure class", example: 3000 })
  fittingClass: number;

  @ApiProperty({ description: "Connection type (SW=Socket Weld, THRD=Threaded)", example: "SW" })
  connectionType: string;

  @ApiProperty({ description: "Material group per B16.5", example: "1.1" })
  materialGroup: string;

  @ApiProperty({ description: "Temperature in Celsius", example: 38 })
  temperatureC: number;

  @ApiProperty({ description: "Maximum working pressure in bar", example: 209 })
  maxPressureBar: number;

  @ApiProperty({ description: "Socket depth multiplier (times NPS)", example: 1.0 })
  socketDepthMultiplier: number | null;

  @ApiProperty({ description: "Additional notes" })
  notes: string | null;

  createdAt: Date;

  updatedAt: Date;
}
