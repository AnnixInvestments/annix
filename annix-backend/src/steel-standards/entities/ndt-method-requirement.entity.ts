import { ApiProperty } from "@nestjs/swagger";
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from "typeorm";

@Entity("ndt_method_requirements")
@Unique(["method", "application"])
export class NdtMethodRequirement {
  @ApiProperty({ description: "Primary key", example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: "NDT method code", example: "RT" })
  @Column({ type: "varchar", length: 10 })
  method: string;

  @ApiProperty({ description: "Method display name", example: "Radiographic Testing" })
  @Column({ name: "method_display_name", type: "varchar", length: 50 })
  methodDisplayName: string;

  @ApiProperty({ description: "ASTM standard reference", example: "ASTM E142" })
  @Column({ name: "astm_standard", type: "varchar", length: 20 })
  astmStandard: string;

  @ApiProperty({ description: "Application type", example: "BUTT_WELD" })
  @Column({ type: "varchar", length: 20 })
  application: string;

  @ApiProperty({ description: "Application display name", example: "Butt Welds" })
  @Column({ name: "application_display_name", type: "varchar", length: 50 })
  applicationDisplayName: string;

  @ApiProperty({ description: "PSL1 coverage percentage", example: 10 })
  @Column({ name: "coverage_psl1_pct", type: "int" })
  coveragePsl1Pct: number;

  @ApiProperty({ description: "PSL2 coverage percentage", example: 100 })
  @Column({ name: "coverage_psl2_pct", type: "int" })
  coveragePsl2Pct: number;

  @ApiProperty({ description: "Acceptance criteria reference", example: "API 1104 Section 9" })
  @Column({ name: "acceptance_criteria_ref", type: "varchar", length: 100 })
  acceptanceCriteriaRef: string;

  @ApiProperty({ description: "Equipment requirements", example: "Industrial X-ray, IQI" })
  @Column({ name: "equipment_requirements", type: "text", nullable: true })
  equipmentRequirements: string | null;

  @ApiProperty({ description: "Minimum operator certification level", example: "Level II" })
  @Column({ name: "operator_cert_level", type: "varchar", length: 20 })
  operatorCertLevel: string;

  @ApiProperty({
    description: "Defect types detected",
    example: "Porosity, Slag, Cracks, Incomplete Fusion",
  })
  @Column({ name: "defects_detected", type: "varchar", length: 200, nullable: true })
  defectsDetected: string | null;

  @ApiProperty({ description: "Additional notes" })
  @Column({ type: "text", nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
