import { ApiProperty } from "@nestjs/swagger";
import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { RfqItem } from "./rfq-item.entity";

@Entity("bend_rfqs")
export class BendRfq {
  @ApiProperty({ description: "Primary key", example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: "Nominal bore in mm", example: 350 })
  @Column({ name: "nominal_bore_mm", type: "int" })
  nominalBoreMm: number;

  @ApiProperty({ description: "Schedule number", example: "Sch30" })
  @Column({ name: "schedule_number", type: "varchar", length: 50 })
  scheduleNumber: string;

  @ApiProperty({ description: "Wall thickness in mm", example: 6.35 })
  @Column({
    name: "wall_thickness_mm",
    type: "decimal",
    precision: 10,
    scale: 3,
    nullable: true,
  })
  wallThicknessMm?: number;

  @ApiProperty({ description: "Bend type (for pulled bends)", example: "3D" })
  @Column({ name: "bend_type", type: "varchar", length: 10, nullable: true })
  bendType?: string;

  @ApiProperty({
    description: "Bend radius type (for SABS 719 segmented bends)",
    example: "long",
  })
  @Column({
    name: "bend_radius_type",
    type: "varchar",
    length: 20,
    nullable: true,
  })
  bendRadiusType?: string;

  @ApiProperty({ description: "Bend angle in degrees", example: 45 })
  @Column({ name: "bend_degrees", type: "decimal", precision: 5, scale: 2 })
  bendDegrees: number;

  @ApiProperty({ description: "Bend end configuration", example: "2xLF" })
  @Column({
    name: "bend_end_configuration",
    type: "varchar",
    length: 50,
    nullable: true,
  })
  bendEndConfiguration?: string;

  @ApiProperty({ description: "Number of tangents", example: 1 })
  @Column({ name: "number_of_tangents", type: "int" })
  numberOfTangents: number;

  @ApiProperty({ description: "Tangent lengths in mm", example: "[400]" })
  @Column({ name: "tangent_lengths", type: "json" })
  tangentLengths: number[];

  @ApiProperty({
    description: "Number of segments (for segmented bends)",
    example: 5,
  })
  @Column({ name: "number_of_segments", type: "int", nullable: true })
  numberOfSegments?: number;

  @ApiProperty({ description: "Quantity value", example: 1 })
  @Column({ name: "quantity_value", type: "decimal", precision: 10, scale: 2 })
  quantityValue: number;

  @ApiProperty({ description: "Quantity type", example: "number_of_items" })
  @Column({ name: "quantity_type", type: "varchar", length: 50 })
  quantityType: string;

  @ApiProperty({ description: "Working pressure in bar", example: 16 })
  @Column({
    name: "working_pressure_bar",
    type: "decimal",
    precision: 6,
    scale: 2,
  })
  workingPressureBar: number;

  @ApiProperty({ description: "Working temperature in Celsius", example: 20 })
  @Column({
    name: "working_temperature_c",
    type: "decimal",
    precision: 5,
    scale: 2,
  })
  workingTemperatureC: number;

  @ApiProperty({ description: "Steel specification ID", example: 2 })
  @Column({ name: "steel_specification_id", type: "int" })
  steelSpecificationId: number;

  @ApiProperty({ description: "Use global flange specs", example: true })
  @Column({ name: "use_global_flange_specs", type: "boolean", default: true })
  useGlobalFlangeSpecs: boolean;

  @ApiProperty({ description: "Flange standard ID", example: 1 })
  @Column({ name: "flange_standard_id", type: "int", nullable: true })
  flangeStandardId?: number;

  @ApiProperty({ description: "Flange pressure class ID", example: 1 })
  @Column({ name: "flange_pressure_class_id", type: "int", nullable: true })
  flangePressureClassId?: number;

  // Calculated fields
  @ApiProperty({ description: "Total weight in kg", example: 125.5 })
  @Column({
    name: "total_weight_kg",
    type: "decimal",
    precision: 10,
    scale: 2,
    nullable: true,
  })
  totalWeightKg?: number;

  @ApiProperty({
    description: "Center-to-face dimension in mm",
    example: 525.0,
  })
  @Column({
    name: "center_to_face_mm",
    type: "decimal",
    precision: 10,
    scale: 2,
    nullable: true,
  })
  centerToFaceMm?: number;

  @ApiProperty({ description: "Total cost in Rand", example: 15500.0 })
  @Column({
    name: "total_cost",
    type: "decimal",
    precision: 12,
    scale: 2,
    nullable: true,
  })
  totalCost?: number;

  @ApiProperty({ description: "Lead time in days", example: 21 })
  @Column({ name: "lead_time_days", type: "int", nullable: true })
  leadTimeDays?: number;

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

  // Relationship to RfqItem
  @OneToOne(
    () => RfqItem,
    (rfqItem) => rfqItem.bendDetails,
  )
  @JoinColumn({ name: "rfq_item_id" })
  rfqItem: RfqItem;

  @Column({
    name: "created_at",
    type: "timestamp",
    default: () => "CURRENT_TIMESTAMP",
  })
  createdAt: Date;

  @Column({
    name: "updated_at",
    type: "timestamp",
    default: () => "CURRENT_TIMESTAMP",
    onUpdate: "CURRENT_TIMESTAMP",
  })
  updatedAt: Date;
}
