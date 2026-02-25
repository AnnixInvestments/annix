import { ApiProperty } from "@nestjs/swagger";
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from "typeorm";

@Entity("pipe_tolerances")
@Unique(["standard", "npsMinMm", "npsMaxMm"])
export class PipeTolerance {
  @ApiProperty({ description: "Primary key", example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: "Standard reference", example: "ASME B36.10M" })
  @Column({ type: "varchar", length: 20 })
  standard: string;

  @ApiProperty({ description: "Minimum NPS in mm for this tolerance range", example: 25 })
  @Column({ name: "nps_min_mm", type: "int" })
  npsMinMm: number;

  @ApiProperty({ description: "Maximum NPS in mm for this tolerance range", example: 450 })
  @Column({ name: "nps_max_mm", type: "int" })
  npsMaxMm: number;

  @ApiProperty({ description: "OD tolerance percentage (+/-)", example: 0.4 })
  @Column({ name: "od_tolerance_pct", type: "decimal", precision: 4, scale: 2 })
  odTolerancePct: number;

  @ApiProperty({ description: "Maximum OD tolerance in mm", example: 12.5 })
  @Column({ name: "od_tolerance_mm_max", type: "decimal", precision: 5, scale: 2, nullable: true })
  odToleranceMmMax: number | null;

  @ApiProperty({ description: "Wall thickness under tolerance percentage", example: 12.5 })
  @Column({ name: "wall_tolerance_pct_under", type: "decimal", precision: 4, scale: 2 })
  wallTolerancePctUnder: number;

  @ApiProperty({ description: "Wall thickness over tolerance percentage", example: 0 })
  @Column({
    name: "wall_tolerance_pct_over",
    type: "decimal",
    precision: 4,
    scale: 2,
    nullable: true,
  })
  wallTolerancePctOver: number | null;

  @ApiProperty({ description: "SRL length plus tolerance in mm", example: 152.4 })
  @Column({ name: "length_srl_plus_mm", type: "decimal", precision: 6, scale: 1 })
  lengthSrlPlusMm: number;

  @ApiProperty({ description: "SRL length minus tolerance in mm", example: 0 })
  @Column({ name: "length_srl_minus_mm", type: "decimal", precision: 6, scale: 1 })
  lengthSrlMinusMm: number;

  @ApiProperty({ description: "DRL length plus tolerance in mm", example: 76.2 })
  @Column({ name: "length_drl_plus_mm", type: "decimal", precision: 6, scale: 1 })
  lengthDrlPlusMm: number;

  @ApiProperty({ description: "DRL length minus tolerance in mm", example: 0 })
  @Column({ name: "length_drl_minus_mm", type: "decimal", precision: 6, scale: 1 })
  lengthDrlMinusMm: number;

  @ApiProperty({
    description: "Straightness tolerance ratio (e.g., 2000 for 1/2000)",
    example: 2000,
  })
  @Column({ name: "straightness_ratio", type: "int" })
  straightnessRatio: number;

  @ApiProperty({ description: "Weight tolerance percentage (+/-)", example: 3.5 })
  @Column({ name: "weight_tolerance_pct", type: "decimal", precision: 4, scale: 2 })
  weightTolerancePct: number;

  @ApiProperty({ description: "Additional notes" })
  @Column({ type: "text", nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
