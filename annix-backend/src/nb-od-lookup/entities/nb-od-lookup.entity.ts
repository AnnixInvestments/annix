import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("nb_od_lookup")
@Index(["nominal_bore_mm"], { unique: true })
export class NbOdLookup {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "integer" })
  nominal_bore_mm: number;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  outside_diameter_mm: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
