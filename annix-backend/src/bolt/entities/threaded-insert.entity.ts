import { ApiProperty } from "@nestjs/swagger";
export class ThreadedInsert {
  id: number;

  @ApiProperty({ example: "M8", description: "Thread size designation" })
  designation: string;

  @ApiProperty({
    example: "helical_coil",
    description: "Insert type: helical_coil, self_tapping, press_in, knurled, self_cutting",
  })
  insertType: string;

  @ApiProperty({ example: "steel", description: "Insert material: steel, stainless, brass" })
  material: string;

  @ApiProperty({ example: "DIN 8140", description: "Manufacturing standard reference" })
  standard: string | null;

  @ApiProperty({ example: 12.0, description: "Outer diameter in mm" })
  outerDiameterMm: number | null;

  @ApiProperty({ example: 12.0, description: "Insert length in mm" })
  lengthMm: number | null;

  @ApiProperty({ example: 0.005, description: "Mass per insert in kg" })
  massKg: number | null;
}
