import { ApiProperty } from "@nestjs/swagger";
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from "typeorm";

export type PslLevel = "PSL1" | "PSL2";

@Entity("api5l_grades")
@Unique(["grade", "pslLevel"])
export class Api5lGrade {
  @ApiProperty({ description: "Primary key", example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: "API 5L grade designation", example: "X65" })
  @Column({ type: "varchar", length: 10 })
  grade: string;

  @ApiProperty({ description: "Product Specification Level", example: "PSL2" })
  @Column({ name: "psl_level", type: "varchar", length: 5 })
  pslLevel: PslLevel;

  @ApiProperty({ description: "Specified Minimum Yield Strength in MPa", example: 450 })
  @Column({ name: "smys_mpa", type: "int" })
  smysMpa: number;

  @ApiProperty({ description: "Specified Minimum Tensile Strength in MPa", example: 535 })
  @Column({ name: "smts_mpa", type: "int" })
  smtsMpa: number;

  @ApiProperty({ description: "Minimum elongation percentage", example: 18 })
  @Column({ name: "elongation_pct_min", type: "decimal", precision: 4, scale: 1 })
  elongationPctMin: number;

  @ApiProperty({ description: "CVN test temperature in Celsius (PSL2)", example: 0 })
  @Column({ name: "cvn_temp_c", type: "int", nullable: true })
  cvnTempC: number | null;

  @ApiProperty({ description: "CVN average energy in Joules (PSL2)", example: 27 })
  @Column({ name: "cvn_avg_j", type: "int", nullable: true })
  cvnAvgJ: number | null;

  @ApiProperty({ description: "CVN minimum single value in Joules (PSL2)", example: 20 })
  @Column({ name: "cvn_min_j", type: "int", nullable: true })
  cvnMinJ: number | null;

  @ApiProperty({ description: "Maximum carbon content percentage", example: 0.18 })
  @Column({ name: "carbon_max_pct", type: "decimal", precision: 4, scale: 3 })
  carbonMaxPct: number;

  @ApiProperty({ description: "Maximum manganese content percentage", example: 1.4 })
  @Column({ name: "manganese_max_pct", type: "decimal", precision: 4, scale: 2 })
  manganeseMaxPct: number;

  @ApiProperty({ description: "Maximum phosphorus content percentage", example: 0.015 })
  @Column({ name: "phosphorus_max_pct", type: "decimal", precision: 5, scale: 4 })
  phosphorusMaxPct: number;

  @ApiProperty({ description: "Maximum sulfur content percentage", example: 0.015 })
  @Column({ name: "sulfur_max_pct", type: "decimal", precision: 5, scale: 4 })
  sulfurMaxPct: number;

  @ApiProperty({ description: "Maximum carbon equivalent (Ceq)", example: 0.43 })
  @Column({ name: "ceq_max", type: "decimal", precision: 4, scale: 3, nullable: true })
  ceqMax: number | null;

  @ApiProperty({ description: "NDT coverage percentage required", example: 100 })
  @Column({ name: "ndt_coverage_pct", type: "int" })
  ndtCoveragePct: number;

  @ApiProperty({ description: "Heat number traceability required", example: true })
  @Column({ name: "heat_traceability_required", type: "boolean", default: false })
  heatTraceabilityRequired: boolean;

  @ApiProperty({ description: "Additional notes" })
  @Column({ type: "text", nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
