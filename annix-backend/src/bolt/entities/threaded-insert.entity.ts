import { ApiProperty } from "@nestjs/swagger";
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("threaded_inserts")
export class ThreadedInsert {
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ example: "M8", description: "Thread size designation" })
  @Column({ type: "varchar", length: 20 })
  designation: string;

  @ApiProperty({
    example: "helical_coil",
    description: "Insert type: helical_coil, self_tapping, press_in, knurled, self_cutting",
  })
  @Column({ name: "insert_type", type: "varchar", length: 50 })
  insertType: string;

  @ApiProperty({ example: "steel", description: "Insert material: steel, stainless, brass" })
  @Column({ type: "varchar", length: 50 })
  material: string;

  @ApiProperty({ example: "DIN 8140", description: "Manufacturing standard reference" })
  @Column({ type: "varchar", length: 100, nullable: true })
  standard: string | null;

  @ApiProperty({ example: 12.0, description: "Outer diameter in mm" })
  @Column({ name: "outer_diameter_mm", type: "float", nullable: true })
  outerDiameterMm: number | null;

  @ApiProperty({ example: 12.0, description: "Insert length in mm" })
  @Column({ name: "length_mm", type: "float", nullable: true })
  lengthMm: number | null;

  @ApiProperty({ example: 0.005, description: "Mass per insert in kg" })
  @Column({ name: "mass_kg", type: "float", nullable: true })
  massKg: number | null;
}
