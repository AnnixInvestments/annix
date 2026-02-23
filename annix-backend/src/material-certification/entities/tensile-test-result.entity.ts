import { ApiProperty } from "@nestjs/swagger";
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { RfqItem } from "../../rfq/entities/rfq-item.entity";

@Entity("tensile_test_results")
export class TensileTestResult {
  @ApiProperty({ description: "Primary key", example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: "Yield strength in MPa", example: 245 })
  @Column({ name: "yield_mpa", type: "decimal", precision: 7, scale: 2, nullable: true })
  yieldMpa?: number;

  @ApiProperty({ description: "Ultimate tensile strength in MPa", example: 415 })
  @Column({ name: "ultimate_mpa", type: "decimal", precision: 7, scale: 2, nullable: true })
  ultimateMpa?: number;

  @ApiProperty({ description: "Elongation percentage", example: 22 })
  @Column({ name: "elongation_pct", type: "decimal", precision: 5, scale: 2, nullable: true })
  elongationPct?: number;

  @ApiProperty({ description: "Reduction of area percentage", example: 50 })
  @Column({
    name: "reduction_of_area_pct",
    type: "decimal",
    precision: 5,
    scale: 2,
    nullable: true,
  })
  reductionOfAreaPct?: number;

  @ApiProperty({ description: "Test temperature in Celsius", example: 20 })
  @Column({ name: "test_temperature_c", type: "decimal", precision: 5, scale: 1, nullable: true })
  testTemperatureC?: number;

  @ApiProperty({ description: "Specimen orientation (L=Longitudinal, T=Transverse)", example: "L" })
  @Column({ name: "specimen_orientation", type: "varchar", length: 5, nullable: true })
  specimenOrientation?: string;

  @ApiProperty({ description: "Specimen location (Base, Weld, HAZ)", example: "Base" })
  @Column({ name: "specimen_location", type: "varchar", length: 20, nullable: true })
  specimenLocation?: string;

  @ApiProperty({ description: "Heat number reference", required: false })
  @Column({ name: "heat_number", type: "varchar", length: 50, nullable: true })
  heatNumber?: string;

  @ApiProperty({ description: "MTC reference number", required: false })
  @Column({ name: "mtc_reference", type: "varchar", length: 100, nullable: true })
  mtcReference?: string;

  @ManyToOne(() => RfqItem, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "rfq_item_id" })
  rfqItem?: RfqItem;

  @Column({ name: "rfq_item_id", type: "int", nullable: true })
  rfqItemId?: number;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
