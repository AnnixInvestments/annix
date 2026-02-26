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

  @ApiProperty({ description: "Manufacturing process (Seamless, ERW, SAW, LSAW)", required: false })
  @Column({ name: "manufacturing_process", type: "varchar", length: 20, nullable: true })
  manufacturingProcess?: string;

  @ApiProperty({ description: "Delivery condition (As-Rolled, Normalized, Q&T)", required: false })
  @Column({ name: "delivery_condition", type: "varchar", length: 20, nullable: true })
  deliveryCondition?: string;

  @ApiProperty({ description: "Bevel angle in degrees (default 37.5°)", required: false })
  @Column({ name: "bevel_angle_deg", type: "decimal", precision: 4, scale: 1, nullable: true })
  bevelAngleDeg?: number;

  @ApiProperty({ description: "Root face dimension in mm (default 1.6mm)", required: false })
  @Column({ name: "root_face_mm", type: "decimal", precision: 4, scale: 2, nullable: true })
  rootFaceMm?: number;

  @ApiProperty({ description: "Root gap dimension in mm (1.6-3.2mm range)", required: false })
  @Column({ name: "root_gap_mm", type: "decimal", precision: 4, scale: 2, nullable: true })
  rootGapMm?: number;

  @ApiProperty({ description: "UNS number (e.g., K03006 for A106 Gr.B)", required: false })
  @Column({ name: "uns_number", type: "varchar", length: 10, nullable: true })
  unsNumber?: string;

  @ApiProperty({ description: "Specified Minimum Yield Strength in MPa", required: false })
  @Column({ name: "smys_mpa", type: "decimal", precision: 6, scale: 1, nullable: true })
  smysMpa?: number;

  @ApiProperty({ description: "Carbon equivalent for weldability (Ceq ≤0.43)", required: false })
  @Column({ name: "carbon_equivalent", type: "decimal", precision: 4, scale: 3, nullable: true })
  carbonEquivalent?: number;

  @ApiProperty({ description: "Hydrotest pressure multiplier (default 1.5)", required: false })
  @Column({
    name: "hydrotest_pressure_multiplier",
    type: "decimal",
    precision: 3,
    scale: 2,
    nullable: true,
  })
  hydrotestPressureMultiplier?: number;

  @ApiProperty({ description: "Hydrotest hold time in minutes (default 10)", required: false })
  @Column({ name: "hydrotest_hold_min", type: "int", nullable: true })
  hydrotestHoldMin?: number;

  @ApiProperty({
    description: "NDT methods required (RT, UT, MT, PT, VT)",
    required: false,
    example: ["RT", "UT"],
  })
  @Column({ name: "ndt_methods", type: "json", nullable: true })
  ndtMethods?: string[];

  // HDPE-specific fields
  @ApiProperty({ description: "HDPE PE grade (PE100, PE4710, etc.)", required: false })
  @Column({ name: "hdpe_pe_grade", type: "varchar", length: 20, nullable: true })
  hdpePeGrade?: string;

  @ApiProperty({ description: "HDPE SDR (Standard Dimension Ratio)", required: false })
  @Column({ name: "hdpe_sdr", type: "decimal", precision: 4, scale: 1, nullable: true })
  hdpeSdr?: number;

  @ApiProperty({
    description: "HDPE PN rating in bar (calculated from SDR/grade)",
    required: false,
  })
  @Column({ name: "hdpe_pn_rating", type: "decimal", precision: 4, scale: 1, nullable: true })
  hdpePnRating?: number;

  @ApiProperty({ description: "HDPE color code (black, blue, yellow)", required: false })
  @Column({ name: "hdpe_color_code", type: "varchar", length: 20, nullable: true })
  hdpeColorCode?: string;

  @ApiProperty({
    description: "HDPE operating temperature in Celsius for derating",
    required: false,
  })
  @Column({
    name: "hdpe_operating_temp_c",
    type: "decimal",
    precision: 4,
    scale: 1,
    nullable: true,
  })
  hdpeOperatingTempC?: number;

  @ApiProperty({ description: "HDPE derated PN after temperature adjustment", required: false })
  @Column({ name: "hdpe_derated_pn", type: "decimal", precision: 4, scale: 1, nullable: true })
  hdpeDeratedPn?: number;

  @ApiProperty({
    description: "HDPE welding method (butt_fusion, electrofusion)",
    required: false,
  })
  @Column({ name: "hdpe_welding_method", type: "varchar", length: 30, nullable: true })
  hdpeWeldingMethod?: string;

  @ApiProperty({
    description: "HDPE welding standard (ASTM_F2620, ISO_21307, DVS_2207_1)",
    required: false,
  })
  @Column({ name: "hdpe_welding_standard", type: "varchar", length: 30, nullable: true })
  hdpeWeldingStandard?: string;

  @ApiProperty({ description: "Number of HDPE fusion joints", required: false })
  @Column({ name: "hdpe_joint_count", type: "int", nullable: true })
  hdpeJointCount?: number;

  @ApiProperty({
    description: "HDPE fitting category (butt_fusion, electrofusion, mechanical)",
    required: false,
  })
  @Column({ name: "hdpe_fitting_category", type: "varchar", length: 30, nullable: true })
  hdpeFittingCategory?: string;

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
