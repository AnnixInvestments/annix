import { ApiProperty } from "@nestjs/swagger";
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("hardness_test_results")
@Index(["heatNumber"])
@Index(["mtcReference"])
export class HardnessTestResult {
  @ApiProperty({ description: "Primary key", example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: "Heat number", example: "H12345" })
  @Column({ name: "heat_number", type: "varchar", length: 50, nullable: true })
  heatNumber: string | null;

  @ApiProperty({ description: "MTC reference number", example: "MTC-2024-001" })
  @Column({ name: "mtc_reference", type: "varchar", length: 100, nullable: true })
  mtcReference: string | null;

  @ApiProperty({ description: "Test location", example: "base_metal" })
  @Column({ name: "test_location", type: "varchar", length: 30, nullable: true })
  testLocation: string | null;

  @ApiProperty({ description: "Hardness value HRC", example: 18 })
  @Column({ name: "hardness_hrc", type: "decimal", precision: 4, scale: 1, nullable: true })
  hardnessHrc: number | null;

  @ApiProperty({ description: "Hardness value HV", example: 220 })
  @Column({ name: "hardness_hv", type: "int", nullable: true })
  hardnessHv: number | null;

  @ApiProperty({ description: "Hardness value HB", example: 200 })
  @Column({ name: "hardness_hb", type: "int", nullable: true })
  hardnessHb: number | null;

  @ApiProperty({ description: "Maximum allowed HRC", example: 22 })
  @Column({ name: "max_allowed_hrc", type: "decimal", precision: 4, scale: 1, nullable: true })
  maxAllowedHrc: number | null;

  @ApiProperty({ description: "Maximum allowed HV", example: 248 })
  @Column({ name: "max_allowed_hv", type: "int", nullable: true })
  maxAllowedHv: number | null;

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
