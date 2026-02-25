import { ApiProperty } from "@nestjs/swagger";
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from "typeorm";

@Entity("pipe_end_preparations")
@Unique(["prepType", "wallThicknessMinMm"])
export class PipeEndPreparation {
  @ApiProperty({ description: "Primary key", example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: "Preparation type code", example: "V_BEVEL" })
  @Column({ name: "prep_type", type: "varchar", length: 20 })
  prepType: string;

  @ApiProperty({ description: "Display name", example: "V-Bevel (Standard)" })
  @Column({ name: "display_name", type: "varchar", length: 50 })
  displayName: string;

  @ApiProperty({ description: "Bevel angle in degrees", example: 37.5 })
  @Column({ name: "bevel_angle_deg", type: "decimal", precision: 4, scale: 1 })
  bevelAngleDeg: number;

  @ApiProperty({ description: "Bevel angle tolerance in degrees (+/-)", example: 2.5 })
  @Column({ name: "bevel_angle_tol_deg", type: "decimal", precision: 3, scale: 1 })
  bevelAngleTolDeg: number;

  @ApiProperty({ description: "Secondary bevel angle for compound bevels", example: 10 })
  @Column({ name: "secondary_angle_deg", type: "decimal", precision: 4, scale: 1, nullable: true })
  secondaryAngleDeg: number | null;

  @ApiProperty({ description: "Root face dimension in mm", example: 1.6 })
  @Column({ name: "root_face_mm", type: "decimal", precision: 4, scale: 2 })
  rootFaceMm: number;

  @ApiProperty({ description: "Root face tolerance in mm (+/-)", example: 0.8 })
  @Column({ name: "root_face_tol_mm", type: "decimal", precision: 4, scale: 2 })
  rootFaceTolMm: number;

  @ApiProperty({ description: "Minimum root gap in mm", example: 1.6 })
  @Column({ name: "root_gap_mm_min", type: "decimal", precision: 4, scale: 2 })
  rootGapMmMin: number;

  @ApiProperty({ description: "Maximum root gap in mm", example: 3.2 })
  @Column({ name: "root_gap_mm_max", type: "decimal", precision: 4, scale: 2 })
  rootGapMmMax: number;

  @ApiProperty({ description: "Land dimension for J/U preps in mm", example: 3.2 })
  @Column({ name: "land_mm", type: "decimal", precision: 4, scale: 2, nullable: true })
  landMm: number | null;

  @ApiProperty({ description: "Minimum applicable wall thickness in mm", example: 0 })
  @Column({ name: "wall_thickness_min_mm", type: "decimal", precision: 5, scale: 2 })
  wallThicknessMinMm: number;

  @ApiProperty({ description: "Maximum applicable wall thickness in mm", example: 999 })
  @Column({ name: "wall_thickness_max_mm", type: "decimal", precision: 5, scale: 2 })
  wallThicknessMaxMm: number;

  @ApiProperty({ description: "Applicable welding codes", example: "B31.3, API 1104" })
  @Column({ name: "applicable_codes", type: "varchar", length: 100, nullable: true })
  applicableCodes: string | null;

  @ApiProperty({ description: "Additional notes" })
  @Column({ type: "text", nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
