import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { RfqItem } from './rfq-item.entity';

export enum PipeSteelWorkType {
  PIPE_SUPPORT = 'pipe_support',
  REINFORCEMENT_PAD = 'reinforcement_pad',
  SADDLE_SUPPORT = 'saddle_support',
  SHOE_SUPPORT = 'shoe_support',
}

export enum BracketType {
  CLEVIS_HANGER = 'clevis_hanger',
  THREE_BOLT_CLAMP = 'three_bolt_clamp',
  WELDED_BRACKET = 'welded_bracket',
  PIPE_SADDLE = 'pipe_saddle',
  U_BOLT = 'u_bolt',
  BAND_HANGER = 'band_hanger',
  ROLLER_SUPPORT = 'roller_support',
  SLIDE_PLATE = 'slide_plate',
}

export enum SupportStandard {
  MSS_SP_58 = 'MSS_SP_58',
  ASME_B31_3 = 'ASME_B31_3',
  SANS_10160 = 'SANS_10160',
}

@Entity('pipe_steel_work_rfqs')
export class PipeSteelWorkRfq {
  @ApiProperty({ description: 'Primary key', example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({
    description: 'Type of pipe steel work',
    enum: PipeSteelWorkType,
  })
  @Column({ name: 'work_type', type: 'enum', enum: PipeSteelWorkType })
  workType: PipeSteelWorkType;

  @ApiProperty({ description: 'Nominal diameter of pipe in mm', example: 200 })
  @Column({
    name: 'nominal_diameter_mm',
    type: 'decimal',
    precision: 10,
    scale: 2,
  })
  nominalDiameterMm: number;

  @ApiProperty({
    description: 'Outside diameter of pipe in mm',
    example: 219.1,
  })
  @Column({
    name: 'outside_diameter_mm',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  outsideDiameterMm?: number;

  @ApiProperty({
    description: 'Wall thickness of pipe in mm',
    example: 8.18,
  })
  @Column({
    name: 'wall_thickness_mm',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  wallThicknessMm?: number;

  @ApiProperty({ description: 'Schedule number', example: 'Sch40' })
  @Column({
    name: 'schedule_number',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  scheduleNumber?: string;

  @ApiProperty({ description: 'Type of bracket', enum: BracketType })
  @Column({
    name: 'bracket_type',
    type: 'enum',
    enum: BracketType,
    nullable: true,
  })
  bracketType?: BracketType;

  @ApiProperty({ description: 'Support standard', enum: SupportStandard })
  @Column({
    name: 'support_standard',
    type: 'enum',
    enum: SupportStandard,
    default: SupportStandard.MSS_SP_58,
  })
  supportStandard: SupportStandard;

  @ApiProperty({ description: 'Support spacing in meters', example: 3.0 })
  @Column({
    name: 'support_spacing_m',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  supportSpacingM?: number;

  @ApiProperty({ description: 'Pipeline length in meters', example: 100 })
  @Column({
    name: 'pipeline_length_m',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  pipelineLengthM?: number;

  @ApiProperty({ description: 'Number of supports required', example: 35 })
  @Column({
    name: 'number_of_supports',
    type: 'int',
    nullable: true,
  })
  numberOfSupports?: number;

  @ApiProperty({
    description: 'Working pressure in bar for reinforcement pad calculation',
    example: 10,
  })
  @Column({
    name: 'working_pressure_bar',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  workingPressureBar?: number;

  @ApiProperty({
    description: 'Working temperature in Celsius',
    example: 50,
  })
  @Column({
    name: 'working_temperature_c',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  workingTemperatureC?: number;

  @ApiProperty({ description: 'Branch diameter for reinforcement pad (mm)' })
  @Column({
    name: 'branch_diameter_mm',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  branchDiameterMm?: number;

  @ApiProperty({ description: 'Header diameter for reinforcement pad (mm)' })
  @Column({
    name: 'header_diameter_mm',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  headerDiameterMm?: number;

  @ApiProperty({ description: 'Reinforcement pad outer diameter (mm)' })
  @Column({
    name: 'pad_outer_diameter_mm',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  padOuterDiameterMm?: number;

  @ApiProperty({ description: 'Reinforcement pad thickness (mm)' })
  @Column({
    name: 'pad_thickness_mm',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  padThicknessMm?: number;

  @ApiProperty({ description: 'Steel specification ID' })
  @Column({ name: 'steel_specification_id', type: 'int', nullable: true })
  steelSpecificationId?: number;

  @ApiProperty({ description: 'Quantity value', example: 10 })
  @Column({
    name: 'quantity_value',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 1,
  })
  quantityValue: number;

  @ApiProperty({ description: 'Quantity type', example: 'number_of_items' })
  @Column({
    name: 'quantity_type',
    type: 'varchar',
    length: 50,
    default: 'number_of_items',
  })
  quantityType: string;

  @ApiProperty({ description: 'Weight per unit in kg', example: 5.5 })
  @Column({
    name: 'weight_per_unit_kg',
    type: 'decimal',
    precision: 10,
    scale: 3,
    nullable: true,
  })
  weightPerUnitKg?: number;

  @ApiProperty({ description: 'Total weight in kg', example: 55.0 })
  @Column({
    name: 'total_weight_kg',
    type: 'decimal',
    precision: 10,
    scale: 3,
    nullable: true,
  })
  totalWeightKg?: number;

  @ApiProperty({ description: 'Unit cost in Rand', example: 150.0 })
  @Column({
    name: 'unit_cost',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  unitCost?: number;

  @ApiProperty({ description: 'Total cost in Rand', example: 1500.0 })
  @Column({
    name: 'total_cost',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  totalCost?: number;

  @ApiProperty({ description: 'Additional notes' })
  @Column({ name: 'notes', type: 'text', nullable: true })
  notes?: string;

  @ApiProperty({ description: 'Calculation data as JSON' })
  @Column({ name: 'calculation_data', type: 'jsonb', nullable: true })
  calculationData?: Record<string, any>;

  @OneToOne(() => RfqItem, (rfqItem) => rfqItem.pipeSteelWorkDetails)
  @JoinColumn({ name: 'rfq_item_id' })
  rfqItem: RfqItem;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
