import { ApiProperty } from "@nestjs/swagger";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Bolt } from "../../bolt/entities/bolt.entity";

@Entity("nut_masses")
// @Unique(['size', 'bolt'])
export class NutMass {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(
    () => Bolt,
    (bolt) => bolt.nutsMasses,
    { onDelete: "CASCADE" },
  )
  @JoinColumn({ name: "bolt_id" })
  bolt: Bolt;

  @ApiProperty({
    example: 0.017,
    description: "Mass of a single nut in kilograms",
  })
  @Column({ type: "float" })
  mass_kg: number;

  @ApiProperty({
    example: "Grade 8",
    description: "Nut grade specification",
  })
  @Column({ type: "varchar", nullable: true })
  grade: string | null; // e.g. "Grade 8", "Grade 2H", "Grade 8M"

  @ApiProperty({
    example: "hex",
    description: "Type of nut",
  })
  @Column({ type: "varchar", nullable: true })
  type: string | null; // e.g. "hex", "lock", "flange", "castle"
}
