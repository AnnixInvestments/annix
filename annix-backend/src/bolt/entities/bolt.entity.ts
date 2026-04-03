import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { BoltMass } from "../../bolt-mass/entities/bolt-mass.entity";
import { NutMass } from "../../nut-mass/entities/nut-mass.entity";

@Entity("bolts")
export class Bolt {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  designation: string;

  @Column({ type: "varchar", nullable: true })
  grade: string | null;

  @Column({ type: "varchar", nullable: true })
  material: string | null;

  @Column({ name: "head_style", type: "varchar", nullable: true })
  headStyle: string | null;

  @Column({ name: "thread_type", type: "varchar", nullable: true })
  threadType: string | null;

  @Column({ name: "thread_pitch_mm", type: "float", nullable: true })
  threadPitchMm: number | null;

  @Column({ type: "varchar", length: 50, nullable: true, default: "plain" })
  finish: string | null;

  @Column({ type: "varchar", length: 100, nullable: true })
  standard: string | null;

  @Column({ type: "varchar", length: 50, nullable: true })
  category: string | null;

  @Column({ name: "drive_type", type: "varchar", length: 50, nullable: true })
  driveType: string | null;

  @Column({ name: "point_type", type: "varchar", length: 50, nullable: true })
  pointType: string | null;

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
