import { Column, Entity, PrimaryGeneratedColumn, Unique } from "typeorm";

@Entity("flange_types")
@Unique(["code"])
export class FlangeType {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", length: 10 })
  code: string; // e.g., "/1", "/2", "/3"

  @Column({ type: "varchar", length: 50 })
  name: string; // e.g., "Weld Neck", "Slip-On"

  @Column({ type: "varchar", length: 10 })
  abbreviation: string; // e.g., "WN", "SO", "SW"

  @Column({ type: "varchar", length: 255, nullable: true })
  description: string | null;

  @Column({
    type: "varchar",
    length: 100,
    nullable: true,
    name: "standard_reference",
  })
  standardReference: string | null; // e.g., "ASME B16.5"
}
