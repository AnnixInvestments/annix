import { ApiProperty } from "@nestjs/swagger";
import { Bolt } from "../../bolt/entities/bolt.entity";

// @Unique(['size', 'bolt'])
export class NutMass {
  id: number;

  bolt: Bolt;

  @ApiProperty({
    example: 0.017,
    description: "Mass of a single nut in kilograms",
  })
  mass_kg: number;

  @ApiProperty({
    example: "Grade 8",
    description: "Nut grade specification",
  })
  grade: string | null; // e.g. "Grade 8", "Grade 2H", "Grade 8M"

  @ApiProperty({
    example: "hex",
    description: "Type of nut",
  })
  type: string | null;

  @ApiProperty({
    example: "DIN 934",
    description: "Manufacturing standard reference",
  })
  standard: string | null;
}
