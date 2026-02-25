import { ApiProperty } from "@nestjs/swagger";
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from "typeorm";

@Entity("material_mechanical_properties")
@Unique(["specificationCode", "grade"])
export class MaterialMechanicalProperty {
  @ApiProperty({ description: "Primary key", example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: "Specification code", example: "ASTM_A106" })
  @Column({ name: "specification_code", type: "varchar", length: 50 })
  specificationCode: string;

  @ApiProperty({ description: "Material grade", example: "B" })
  @Column({ type: "varchar", length: 20 })
  grade: string;

  @ApiProperty({ description: "UNS number", example: "K03006" })
  @Column({ name: "uns_number", type: "varchar", length: 10, nullable: true })
  unsNumber: string | null;

  @ApiProperty({ description: "ASME P-number", example: "1" })
  @Column({ name: "p_number", type: "varchar", length: 10, nullable: true })
  pNumber: string | null;

  @ApiProperty({ description: "ASME Group number", example: "2" })
  @Column({ name: "group_number", type: "varchar", length: 10, nullable: true })
  groupNumber: string | null;

  @ApiProperty({ description: "Minimum yield strength MPa", example: 240 })
  @Column({ name: "smys_mpa", type: "int", nullable: true })
  smysMpa: number | null;

  @ApiProperty({ description: "Minimum tensile strength MPa", example: 415 })
  @Column({ name: "smts_mpa", type: "int", nullable: true })
  smtsMpa: number | null;

  @ApiProperty({ description: "Minimum elongation %", example: 21 })
  @Column({ name: "elongation_pct_min", type: "decimal", precision: 4, scale: 1, nullable: true })
  elongationPctMin: number | null;

  @ApiProperty({ description: "Maximum carbon equivalent (IIW)", example: 0.43 })
  @Column({
    name: "carbon_equivalent_max",
    type: "decimal",
    precision: 4,
    scale: 3,
    nullable: true,
  })
  carbonEquivalentMax: number | null;

  @ApiProperty({ description: "CE formula type", example: "IIW" })
  @Column({ name: "ce_formula", type: "varchar", length: 10, nullable: true })
  ceFormula: string | null;

  @ApiProperty({ description: "Impact test temperature C", example: -29 })
  @Column({ name: "impact_test_temp_c", type: "int", nullable: true })
  impactTestTempC: number | null;

  @ApiProperty({ description: "Minimum impact energy J", example: 27 })
  @Column({ name: "min_impact_j", type: "int", nullable: true })
  minImpactJ: number | null;

  @ApiProperty({ description: "Maximum hardness HRC", example: 22 })
  @Column({ name: "hardness_max_hrc", type: "int", nullable: true })
  hardnessMaxHrc: number | null;

  @ApiProperty({ description: "Maximum hardness HV", example: 248 })
  @Column({ name: "hardness_max_hv", type: "int", nullable: true })
  hardnessMaxHv: number | null;

  @ApiProperty({ description: "Applicable standards" })
  @Column({ name: "applicable_standards", type: "text", nullable: true })
  applicableStandards: string | null;

  @ApiProperty({ description: "Additional notes" })
  @Column({ type: "text", nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
