import { ApiProperty } from "@nestjs/swagger";
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("impact_test_results")
@Index(["heatNumber"])
@Index(["mtcReference"])
export class ImpactTestResult {
  @ApiProperty({ description: "Primary key", example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: "Heat number", example: "H12345" })
  @Column({ name: "heat_number", type: "varchar", length: 50, nullable: true })
  heatNumber: string | null;

  @ApiProperty({ description: "MTC reference number", example: "MTC-2024-001" })
  @Column({ name: "mtc_reference", type: "varchar", length: 100, nullable: true })
  mtcReference: string | null;

  @ApiProperty({ description: "Test temperature C", example: -29 })
  @Column({ name: "test_temp_c", type: "int" })
  testTempC: number;

  @ApiProperty({ description: "Specimen size", example: "10x10" })
  @Column({ name: "specimen_size", type: "varchar", length: 20, nullable: true })
  specimenSize: string | null;

  @ApiProperty({ description: "Specimen orientation", example: "T" })
  @Column({ name: "specimen_orientation", type: "varchar", length: 5, nullable: true })
  specimenOrientation: string | null;

  @ApiProperty({ description: "Impact value 1 in Joules", example: 45 })
  @Column({ name: "impact_value_1_j", type: "decimal", precision: 6, scale: 1 })
  impactValue1J: number;

  @ApiProperty({ description: "Impact value 2 in Joules", example: 48 })
  @Column({ name: "impact_value_2_j", type: "decimal", precision: 6, scale: 1 })
  impactValue2J: number;

  @ApiProperty({ description: "Impact value 3 in Joules", example: 42 })
  @Column({ name: "impact_value_3_j", type: "decimal", precision: 6, scale: 1 })
  impactValue3J: number;

  @ApiProperty({ description: "Average impact value in Joules", example: 45 })
  @Column({ name: "impact_average_j", type: "decimal", precision: 6, scale: 1 })
  impactAverageJ: number;

  @ApiProperty({ description: "Minimum required average J", example: 27 })
  @Column({ name: "required_avg_j", type: "int", nullable: true })
  requiredAvgJ: number | null;

  @ApiProperty({ description: "Minimum required single J", example: 20 })
  @Column({ name: "required_min_j", type: "int", nullable: true })
  requiredMinJ: number | null;

  @ApiProperty({ description: "Test result passed", example: true })
  @Column({ type: "boolean", default: true })
  passed: boolean;

  @ApiProperty({ description: "RFQ item ID reference" })
  @Column({ name: "rfq_item_id", type: "int", nullable: true })
  rfqItemId: number | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
