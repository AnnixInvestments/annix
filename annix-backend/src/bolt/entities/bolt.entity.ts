import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { BoltMass } from "../../bolt-mass/entities/bolt-mass.entity";
import { NutMass } from "../../nut-mass/entities/nut-mass.entity";

@Entity("bolts")
export class Bolt {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  designation: string; // e.g. "M12", "M16"

  @Column({ type: "varchar", nullable: true })
  grade: string | null; // e.g. "8.8", "10.9", "12.9"

  @Column({ type: "varchar", nullable: true })
  material: string | null; // e.g. "Carbon Steel", "Stainless Steel"

  @Column({ name: "head_style", type: "varchar", nullable: true })
  headStyle: string | null; // e.g. "hex", "stud"

  @Column({ name: "thread_type", type: "varchar", nullable: true })
  threadType: string | null; // e.g. "coarse", "fine"

  @Column({ name: "thread_pitch_mm", type: "float", nullable: true })
  threadPitchMm: number | null;

  @OneToMany(
    () => BoltMass,
    (mass) => mass.bolt,
  )
  boltMasses: BoltMass[];

  @OneToMany(
    () => NutMass,
    (nut) => nut.bolt,
  )
  nutsMasses: NutMass[];
}
