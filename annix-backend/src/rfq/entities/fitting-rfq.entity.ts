import { ApiProperty } from "@nestjs/swagger";
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { RfqItem } from "./rfq-item.entity";

@Entity("fitting_rfqs")
export class FittingRfq {
  @ApiProperty({ description: "Primary key", example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: "Nominal diameter in mm", example: 500 })
  @Column({
    name: "nominal_diameter_mm",
    type: "decimal",
    precision: 10,
    scale: 3,
  })
  nominalDiameterMm: number;

  @ApiProperty({ description: "Schedule number", example: "WT6" })
  @Column({ name: "schedule_number", type: "varchar", length: 50 })
  scheduleNumber: string;

  @ApiProperty({ description: "Wall thickness in mm", example: 6 })
  @Column({
    name: "wall_thickness_mm",
    type: "decimal",
    precision: 10,
    scale: 3,
    nullable: true,
  })
  wallThicknessMm?: number;

  @ApiProperty({ description: "Fitting type", example: "SHORT_TEE" })
  @Column({ name: "fitting_type", type: "varchar", length: 50 })
  fittingType: string;

  @ApiProperty({ description: "Fitting standard", example: "SABS719" })
  @Column({
    name: "fitting_standard",
    type: "varchar",
    length: 50,
    nullable: true,
  })
  fittingStandard?: string;

  @ApiProperty({ description: "Pipe length A in mm", example: 1020 })
  @Column({
    name: "pipe_length_a_mm",
    type: "decimal",
    precision: 10,
    scale: 3,
    nullable: true,
  })
  pipeLengthAMm?: number;

  @ApiProperty({ description: "Pipe length B in mm", example: 510 })
  @Column({
    name: "pipe_length_b_mm",
    type: "decimal",
    precision: 10,
    scale: 3,
    nullable: true,
  })
  pipeLengthBMm?: number;

  @ApiProperty({ description: "Pipe end configuration", example: "F2E_RF" })
  @Column({
    name: "pipe_end_configuration",
    type: "varchar",
    length: 50,
    nullable: true,
  })
  pipeEndConfiguration?: string;

  @ApiProperty({ description: "Whether to add blank flange", example: true })
  @Column({ name: "add_blank_flange", type: "boolean", default: false })
  addBlankFlange: boolean;

  @ApiProperty({ description: "Blank flange count", example: 1 })
  @Column({ name: "blank_flange_count", type: "int", nullable: true })
  blankFlangeCount?: number;

  @ApiProperty({
    description: "Blank flange positions as JSON array",
    example: '["inlet"]',
  })
  @Column({ name: "blank_flange_positions", type: "json", nullable: true })
  blankFlangePositions?: string[];

  @ApiProperty({ description: "Quantity value", example: 1 })
  @Column({
    name: "quantity_value",
    type: "decimal",
    precision: 10,
    scale: 2,
    default: 1,
  })
  quantityValue: number;

  @ApiProperty({ description: "Quantity type", example: "number_of_items" })
  @Column({
    name: "quantity_type",
    type: "varchar",
    length: 50,
    default: "number_of_items",
  })
  quantityType: string;

  @ApiProperty({ description: "Working pressure in bar", example: 10 })
  @Column({
    name: "working_pressure_bar",
    type: "decimal",
    precision: 6,
    scale: 2,
    nullable: true,
  })
  workingPressureBar?: number;

  @ApiProperty({ description: "Working temperature in Celsius", example: 50 })
  @Column({
    name: "working_temperature_c",
    type: "decimal",
    precision: 5,
    scale: 2,
    nullable: true,
  })
  workingTemperatureC?: number;

  @ApiProperty({ description: "Total weight in kg", example: 125.52 })
  @Column({
    name: "total_weight_kg",
    type: "decimal",
    precision: 10,
    scale: 3,
    nullable: true,
  })
  totalWeightKg?: number;

  @ApiProperty({ description: "Number of flanges", example: 3 })
  @Column({ name: "number_of_flanges", type: "int", nullable: true })
  numberOfFlanges?: number;

  @ApiProperty({ description: "Number of flange welds", example: 3 })
  @Column({ name: "number_of_flange_welds", type: "int", nullable: true })
  numberOfFlangeWelds?: number;

  @ApiProperty({ description: "Number of tee welds", example: 1 })
  @Column({ name: "number_of_tee_welds", type: "int", nullable: true })
  numberOfTeeWelds?: number;

  @ApiProperty({ description: "Calculation data as JSON", required: false })
  @Column({ name: "calculation_data", type: "jsonb", nullable: true })
  calculationData?: Record<string, any>;

  @ApiProperty({ description: "PSL level (PSL1 or PSL2) for API 5L specs", required: false })
  @Column({ name: "psl_level", type: "varchar", length: 10, nullable: true })
  pslLevel?: string;

  @ApiProperty({ description: "CVN test temperature in Celsius", required: false })
  @Column({
    name: "cvn_test_temperature_c",
    type: "decimal",
    precision: 5,
    scale: 1,
    nullable: true,
  })
  cvnTestTemperatureC?: number;

  @ApiProperty({ description: "CVN average impact energy in Joules", required: false })
  @Column({ name: "cvn_average_joules", type: "decimal", precision: 6, scale: 1, nullable: true })
  cvnAverageJoules?: number;

  @ApiProperty({ description: "CVN minimum impact energy in Joules", required: false })
  @Column({ name: "cvn_minimum_joules", type: "decimal", precision: 6, scale: 1, nullable: true })
  cvnMinimumJoules?: number;

  @ApiProperty({ description: "Heat number for traceability", required: false })
  @Column({ name: "heat_number", type: "varchar", length: 50, nullable: true })
  heatNumber?: string;

  @ApiProperty({ description: "Material Test Certificate reference", required: false })
  @Column({ name: "mtc_reference", type: "varchar", length: 100, nullable: true })
  mtcReference?: string;

  @ApiProperty({ description: "NDT coverage percentage (100% for PSL2)", required: false })
  @Column({ name: "ndt_coverage_pct", type: "decimal", precision: 5, scale: 2, nullable: true })
  ndtCoveragePct?: number;

  @ApiProperty({ description: "Lot number for traceability", required: false })
  @Column({ name: "lot_number", type: "varchar", length: 50, nullable: true })
  lotNumber?: string;

  @ApiProperty({ description: "NACE MR0175/ISO 15156 compliance", required: false })
  @Column({ name: "nace_compliant", type: "boolean", nullable: true })
  naceCompliant?: boolean;

  @ApiProperty({ description: "H2S zone (1, 2, or 3) for sour service", required: false })
  @Column({ name: "h2s_zone", type: "integer", nullable: true })
  h2sZone?: number;

  @ApiProperty({ description: "Maximum hardness in HRC (<=22 for sour service)", required: false })
  @Column({ name: "max_hardness_hrc", type: "decimal", precision: 4, scale: 1, nullable: true })
  maxHardnessHrc?: number;

  @ApiProperty({ description: "Sulfide Stress Cracking tested", required: false })
  @Column({ name: "ssc_tested", type: "boolean", nullable: true })
  sscTested?: boolean;

  @OneToOne(
    () => RfqItem,
    (rfqItem) => rfqItem.fittingDetails,
  )
  @JoinColumn({ name: "rfq_item_id" })
  rfqItem: RfqItem;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
