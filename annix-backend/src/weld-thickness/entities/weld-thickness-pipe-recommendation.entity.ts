import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("weld_thickness_pipe_recommendations")
@Index(["steel_type", "nominal_bore_mm", "temperature_celsius"])
export class WeldThicknessPipeRecommendation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "varchar", length: 50 })
  steel_type: string; // 'CARBON_STEEL' or 'STAINLESS_STEEL'

  @Column({ type: "integer" })
  nominal_bore_mm: number;

  @Column({ type: "varchar", length: 20 })
  schedule: string;

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
