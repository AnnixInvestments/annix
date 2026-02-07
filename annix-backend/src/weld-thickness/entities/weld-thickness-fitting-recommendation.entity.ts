import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("weld_thickness_fitting_recommendations")
@Index(["fitting_type", "nominal_bore_mm", "temperature_celsius"])
export class WeldThicknessFittingRecommendation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", length: 50 })
  fitting_type: string; // '45E', '90E', 'TEE', 'BW_RED', 'PIPE'

  @Column({ type: "varchar", length: 20 })
  fitting_class: string; // 'STD', 'XH', 'XXH'

  @Column({ type: "integer" })
  nominal_bore_mm: number;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  wall_thickness_mm: number;

  @Column({ type: "integer" })
  temperature_celsius: number;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  max_pressure_bar: number;

  @Column({ type: "text", nullable: true })
  notes: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
