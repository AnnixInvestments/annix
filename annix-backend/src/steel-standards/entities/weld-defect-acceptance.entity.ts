import { ApiProperty } from "@nestjs/swagger";
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from "typeorm";

@Entity("weld_defect_acceptance")
@Unique(["code", "defectType"])
export class WeldDefectAcceptance {
  @ApiProperty({ description: "Primary key", example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: "Welding code reference", example: "API_1104" })
  @Column({ type: "varchar", length: 20 })
  code: string;

  @ApiProperty({ description: "Code display name", example: "API 1104" })
  @Column({ name: "code_display_name", type: "varchar", length: 50 })
  codeDisplayName: string;

  @ApiProperty({ description: "Defect type", example: "UNDERCUT" })
  @Column({ name: "defect_type", type: "varchar", length: 30 })
  defectType: string;

  @ApiProperty({ description: "Defect display name", example: "Undercut" })
  @Column({ name: "defect_display_name", type: "varchar", length: 50 })
  defectDisplayName: string;

  @ApiProperty({ description: "Maximum dimension in mm", example: 0.8 })
  @Column({ name: "max_dimension_mm", type: "decimal", precision: 5, scale: 2, nullable: true })
  maxDimensionMm: number | null;

  @ApiProperty({ description: "Maximum dimension as percentage of wall thickness", example: 10 })
  @Column({ name: "max_dimension_pct_t", type: "decimal", precision: 5, scale: 2, nullable: true })
  maxDimensionPctT: number | null;

  @ApiProperty({
    description: "Spacing requirement description",
    example: "6x diameter minimum spacing",
  })
  @Column({ name: "spacing_requirement", type: "varchar", length: 100, nullable: true })
  spacingRequirement: string | null;

  @ApiProperty({
    description: "Cumulative limit description",
    example: "Train <=25% circumference",
  })
  @Column({ name: "cumulative_limit", type: "varchar", length: 100, nullable: true })
  cumulativeLimit: string | null;

  @ApiProperty({ description: "Maximum repairs allowed per joint", example: 2 })
  @Column({ name: "repair_limit", type: "int", nullable: true })
  repairLimit: number | null;

  @ApiProperty({ description: "Whether this defect is permitted at all", example: true })
  @Column({ name: "permitted", type: "boolean", default: true })
  permitted: boolean;

  @ApiProperty({ description: "Additional notes" })
  @Column({ type: "text", nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
