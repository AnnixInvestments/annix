import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsNumber } from "class-validator";

export class CreateNominalOutsideDiameterMmDto {
  @ApiProperty({ description: "Nominal diameter in mm", example: 50 })
  @IsNumber()
  @IsNotEmpty()
  nominal_diameter_mm: number;

  @ApiProperty({ description: "Outside diameter in mm", example: 60.32 })
  @IsNumber()
  @IsNotEmpty()
  outside_diameter_mm: number;

  // @ApiProperty({
  //     description: 'Optional pipe dimensions linked to this nominal outside diameter',
  //     type: [CreatePipeDimensionDto],
  //     required: false,
  // })
  // @IsOptional()
  // @ValidateNested({ each: true })
  // @Type(() => CreatePipeDimensionDto)
  // pipeDimensions?: CreatePipeDimensionDto[];
}
