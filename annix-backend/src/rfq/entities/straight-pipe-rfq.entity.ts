import { ApiProperty } from "@nestjs/swagger";
import { Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { SteelSpecification } from "../../steel-specification/entities/steel-specification.entity";
import { RfqItem } from "./rfq-item.entity";

export enum LengthUnit {
  METERS = "meters",
  FEET = "feet",
}

export enum QuantityType {
  TOTAL_LENGTH = "total_length",
  NUMBER_OF_PIPES = "number_of_pipes",
}

export enum ScheduleType {
  SCHEDULE = "schedule",
  WALL_THICKNESS = "wall_thickness",
}

@Entity("straight_pipe_rfqs")
export class StraightPipeRfq {
  @ApiProperty({ description: "Primary key", example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: "Nominal bore in mm", example: 500 })
  @Column({ name: "nominal_bore_mm", type: "decimal", precision: 8, scale: 3 })
  nominalBoreMm: number;

  @ApiProperty({
    description: "Schedule type - using schedule number or wall thickness",
    enum: ScheduleType,
  })
  @Column({ name: "schedule_type", type: "enum", enum: ScheduleType })
  scheduleType: ScheduleType;

  @ApiProperty({
    description: "Schedule number (e.g., Sch20, Sch40)",
    required: false,
  })
  @Column({ name: "schedule_number", nullable: true })
  scheduleNumber?: string;

  @ApiProperty({
    description: "Wall thickness in mm (if not using schedule)",
    required: false,
  })
  @Column({
    name: "wall_thickness_mm",
    type: "decimal",
    precision: 8,
    scale: 3,
    nullable: true,
  })
  wallThicknessMm?: number;

  @ApiProperty({
    description: "Pipe end configuration",
    example: "FBE",
    required: false,
  })
  @Column({ name: "pipe_end_configuration", nullable: true })
  pipeEndConfiguration?: string;

  @ApiProperty({ description: "Individual pipe length", example: 12.192 })
  @Column({
    name: "individual_pipe_length",
    type: "decimal",
    precision: 8,
    scale: 3,
  })
  individualPipeLength: number;

  @ApiProperty({ description: "Length unit", enum: LengthUnit })
  @Column({ name: "length_unit", type: "enum", enum: LengthUnit })
  lengthUnit: LengthUnit;

  @ApiProperty({
    description: "Quantity type - total length or number of pipes",
    enum: QuantityType,
  })
  @Column({ name: "quantity_type", type: "enum", enum: QuantityType })
  quantityType: QuantityType;

  @ApiProperty({
    description: "Quantity value - total meters or number of pipes",
    example: 8000,
  })
  @Column({ name: "quantity_value", type: "decimal", precision: 10, scale: 3 })
  quantityValue: number;

  @ApiProperty({ description: "Working pressure in bar", example: 10 })
  @Column({
    name: "working_pressure_bar",
    type: "decimal",
    precision: 8,
    scale: 2,
  })
  workingPressureBar: number;

  @ApiProperty({
    description: "Working temperature in celsius",
    required: false,
  })
  @Column({
    name: "working_temperature_c",
    type: "decimal",
    precision: 8,
    scale: 2,
    nullable: true,
  })
  workingTemperatureC?: number;

  // Calculated fields
  @ApiProperty({
    description: "Calculated outside diameter in mm",
    required: false,
  })
  @Column({
    name: "calculated_od_mm",
    type: "decimal",
    precision: 8,
    scale: 3,
    nullable: true,
  })
  calculatedOdMm?: number;

  @ApiProperty({
    description: "Calculated wall thickness in mm",
    required: false,
  })
  @Column({
    name: "calculated_wt_mm",
    type: "decimal",
    precision: 8,
    scale: 3,
    nullable: true,
  })
  calculatedWtMm?: number;

  @ApiProperty({
    description: "Calculated pipe weight per meter in kg",
    required: false,
  })
  @Column({
    name: "pipe_weight_per_meter",
    type: "decimal",
    precision: 10,
    scale: 3,
    nullable: true,
  })
  pipeWeightPerMeterKg?: number;

  @ApiProperty({
    description: "Calculated total pipe weight in kg",
    required: false,
  })
  @Column({
    name: "total_pipe_weight",
    type: "decimal",
    precision: 12,
    scale: 2,
    nullable: true,
  })
  totalPipeWeightKg?: number;

  @ApiProperty({ description: "Calculated number of pipes", required: false })
  @Column({ name: "calculated_pipe_count", type: "int", nullable: true })
  calculatedPipeCount?: number;

  @ApiProperty({
    description: "Calculated total length in meters",
    required: false,
  })
  @Column({
    name: "calculated_total_length",
    type: "decimal",
    precision: 10,
    scale: 3,
    nullable: true,
  })
  calculatedTotalLengthM?: number;

  @ApiProperty({ description: "Number of flanges required", required: false })
  @Column({ name: "number_of_flanges", type: "int", nullable: true })
  numberOfFlanges?: number;

  @ApiProperty({
    description: "Number of butt welds required",
    required: false,
  })
  @Column({ name: "number_of_butt_welds", type: "int", nullable: true })
  numberOfButtWelds?: number;

  @ApiProperty({
    description: "Total butt weld length in meters",
    required: false,
  })
  @Column({
    name: "total_butt_weld_length",
    type: "decimal",
    precision: 10,
    scale: 3,
    nullable: true,
  })
  totalButtWeldLengthM?: number;

  @ApiProperty({
    description: "Number of flange welds required",
    required: false,
  })
  @Column({ name: "number_of_flange_welds", type: "int", nullable: true })
  numberOfFlangeWelds?: number;

  @ApiProperty({
    description: "Total flange weld length in meters",
    required: false,
  })
  @Column({
    name: "total_flange_weld_length",
    type: "decimal",
    precision: 10,
    scale: 3,
    nullable: true,
  })
  totalFlangeWeldLengthM?: number;

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

  // Relationships
  @ApiProperty({ description: "Parent RFQ item", type: () => RfqItem })
  @OneToOne(
    () => RfqItem,
    (rfqItem) => rfqItem.straightPipeDetails,
    {
      onDelete: "CASCADE",
    },
  )
  @JoinColumn({ name: "rfq_item_id" })
  rfqItem: RfqItem;

  @ApiProperty({ description: "Steel specification", required: false })
  @ManyToOne(() => SteelSpecification, { nullable: true })
  @JoinColumn({ name: "steel_specification_id" })
  steelSpecification?: SteelSpecification;
}
