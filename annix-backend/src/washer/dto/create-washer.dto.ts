import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, IsOptional, IsString } from "class-validator";

export class CreateWasherDto {
  @ApiProperty({ example: 1, description: "Bolt ID" })
  @IsNumber()
  boltId: number;

  @ApiProperty({ example: "split", description: "Washer type" })
  @IsString()
  type: string;

  @ApiProperty({
    example: "Carbon Steel",
    description: "Material",
    required: false,
  })
  @IsString()
  @IsOptional()
  material?: string;

  @ApiProperty({ example: 0.012, description: "Mass in kg" })
  @IsNumber()
  massKg: number;

  @ApiProperty({
    example: 20.0,
    description: "Outside diameter in mm",
    required: false,
  })
  @IsNumber()
  @IsOptional()
  odMm?: number;

  @ApiProperty({
    example: 10.5,
    description: "Inside diameter in mm",
    required: false,
  })
  @IsNumber()
  @IsOptional()
  idMm?: number;

  @ApiProperty({
    example: 2.5,
    description: "Thickness in mm",
    required: false,
  })
  @IsNumber()
  @IsOptional()
  thicknessMm?: number;
}
