import { ApiProperty } from "@nestjs/swagger";
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from "typeorm";

@Entity("reinforcement_pad_standards")
@Unique(["branchNbMm", "headerNbMm"])
export class ReinforcementPadStandardEntity {
  @ApiProperty({ description: "Primary key", example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: "Branch NPS designation", example: '4"' })
  @Column({ name: "branch_nps", type: "varchar", length: 10 })
  branchNps: string;

  @ApiProperty({ description: "Branch nominal bore (mm)", example: 100 })
  @Column({ name: "branch_nb_mm", type: "int" })
  branchNbMm: number;

  @ApiProperty({ description: "Header NPS designation", example: '8"' })
  @Column({ name: "header_nps", type: "varchar", length: 10 })
  headerNps: string;

  @ApiProperty({ description: "Header nominal bore (mm)", example: 200 })
  @Column({ name: "header_nb_mm", type: "int" })
  headerNbMm: number;

  @ApiProperty({ description: "Minimum pad width (mm)", example: 76 })
  @Column({ name: "min_pad_width_mm", type: "decimal", precision: 8, scale: 2 })
  minPadWidthMm: number;

  @ApiProperty({ description: "Minimum pad thickness (mm)", example: 9.5 })
  @Column({
    name: "min_pad_thickness_mm",
    type: "decimal",
    precision: 8,
    scale: 2,
  })
  minPadThicknessMm: number;

  @ApiProperty({ description: "Typical weight (kg)", example: 1.9 })
  @Column({
    name: "typical_weight_kg",
    type: "decimal",
    precision: 8,
    scale: 3,
  })
  typicalWeightKg: number;

  @ApiProperty({ description: "Notes", required: false })
  @Column({ name: "notes", type: "text", nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
