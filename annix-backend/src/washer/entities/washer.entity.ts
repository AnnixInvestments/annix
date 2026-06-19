import { ApiProperty } from "@nestjs/swagger";
import { Bolt } from "../../bolt/entities/bolt.entity";

export class Washer {
  id: number;

  bolt: Bolt;

  @ApiProperty({
    example: "split",
    description: "Type of washer (flat, split, tooth, belleville)",
  })
  type: string;

  @ApiProperty({
    example: "Carbon Steel",
    description: "Washer material",
  })
  material: string | null;

  @ApiProperty({
    example: 0.012,
    description: "Mass of a single washer in kilograms",
  })
  massKg: number;

  @ApiProperty({
    example: 20.0,
    description: "Outside diameter in mm",
  })
  odMm: number | null;

  @ApiProperty({
    example: 10.5,
    description: "Inside diameter in mm",
  })
  idMm: number | null;

  @ApiProperty({
    example: 2.5,
    description: "Thickness in mm",
  })
  thicknessMm: number | null;

  @ApiProperty({
    example: "DIN 125",
    description: "Manufacturing standard reference",
  })
  standard: string | null;
}
