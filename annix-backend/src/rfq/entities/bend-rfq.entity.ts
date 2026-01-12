import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { RfqItem } from './rfq-item.entity';

@Entity('bend_rfqs')
export class BendRfq {
  @ApiProperty({ description: 'Primary key', example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'Nominal bore in mm', example: 350 })
  @Column({ name: 'nominal_bore_mm', type: 'int' })
  nominalBoreMm: number;

  @ApiProperty({ description: 'Schedule number', example: 'Sch30' })
  @Column({ name: 'schedule_number', type: 'varchar', length: 50 })
  scheduleNumber: string;

  @ApiProperty({ description: 'Wall thickness in mm', example: 6.35 })
  @Column({
    name: 'wall_thickness_mm',
    type: 'decimal',
    precision: 10,
    scale: 3,
    nullable: true,
  })
  wallThicknessMm?: number;

  @ApiProperty({ description: 'Bend type (for pulled bends)', example: '3D' })
  @Column({ name: 'bend_type', type: 'varchar', length: 10, nullable: true })
  bendType?: string;

  @ApiProperty({
    description: 'Bend radius type (for SABS 719 segmented bends)',
    example: 'long',
  })
  @Column({
    name: 'bend_radius_type',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  bendRadiusType?: string;

  @ApiProperty({ description: 'Bend angle in degrees', example: 45 })
  @Column({ name: 'bend_degrees', type: 'decimal', precision: 5, scale: 2 })
  bendDegrees: number;

  @ApiProperty({ description: 'Bend end configuration', example: '2xLF' })
  @Column({
    name: 'bend_end_configuration',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  bendEndConfiguration?: string;

  @ApiProperty({ description: 'Number of tangents', example: 1 })
  @Column({ name: 'number_of_tangents', type: 'int' })
  numberOfTangents: number;

  @ApiProperty({ description: 'Tangent lengths in mm', example: '[400]' })
  @Column({ name: 'tangent_lengths', type: 'json' })
  tangentLengths: number[];

  @ApiProperty({
    description: 'Number of segments (for segmented bends)',
    example: 5,
  })
  @Column({ name: 'number_of_segments', type: 'int', nullable: true })
  numberOfSegments?: number;

  @ApiProperty({ description: 'Quantity value', example: 1 })
  @Column({ name: 'quantity_value', type: 'decimal', precision: 10, scale: 2 })
  quantityValue: number;

  @ApiProperty({ description: 'Quantity type', example: 'number_of_items' })
  @Column({ name: 'quantity_type', type: 'varchar', length: 50 })
  quantityType: string;

  @ApiProperty({ description: 'Working pressure in bar', example: 16 })
  @Column({
    name: 'working_pressure_bar',
    type: 'decimal',
    precision: 6,
    scale: 2,
  })
  workingPressureBar: number;

  @ApiProperty({ description: 'Working temperature in Celsius', example: 20 })
  @Column({
    name: 'working_temperature_c',
    type: 'decimal',
    precision: 5,
    scale: 2,
  })
  workingTemperatureC: number;

  @ApiProperty({ description: 'Steel specification ID', example: 2 })
  @Column({ name: 'steel_specification_id', type: 'int' })
  steelSpecificationId: number;

  @ApiProperty({ description: 'Use global flange specs', example: true })
  @Column({ name: 'use_global_flange_specs', type: 'boolean', default: true })
  useGlobalFlangeSpecs: boolean;

  @ApiProperty({ description: 'Flange standard ID', example: 1 })
  @Column({ name: 'flange_standard_id', type: 'int', nullable: true })
  flangeStandardId?: number;

  @ApiProperty({ description: 'Flange pressure class ID', example: 1 })
  @Column({ name: 'flange_pressure_class_id', type: 'int', nullable: true })
  flangePressureClassId?: number;

  // Calculated fields
  @ApiProperty({ description: 'Total weight in kg', example: 125.5 })
  @Column({
    name: 'total_weight_kg',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  totalWeightKg?: number;

  @ApiProperty({
    description: 'Center-to-face dimension in mm',
    example: 525.0,
  })
  @Column({
    name: 'center_to_face_mm',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  centerToFaceMm?: number;

  @ApiProperty({ description: 'Total cost in Rand', example: 15500.0 })
  @Column({
    name: 'total_cost',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  totalCost?: number;

  @ApiProperty({ description: 'Lead time in days', example: 21 })
  @Column({ name: 'lead_time_days', type: 'int', nullable: true })
  leadTimeDays?: number;

  @ApiProperty({ description: 'Calculation data as JSON', required: false })
  @Column({ name: 'calculation_data', type: 'jsonb', nullable: true })
  calculationData?: Record<string, any>;

  // Relationship to RfqItem
  @OneToOne(() => RfqItem, (rfqItem) => rfqItem.bendDetails)
  @JoinColumn({ name: 'rfq_item_id' })
  rfqItem: RfqItem;

  @Column({
    name: 'created_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;

  @Column({
    name: 'updated_at',
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;
}
