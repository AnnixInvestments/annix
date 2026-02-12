import { Entity, PrimaryGeneratedColumn, Column, OneToOne, ManyToOne, JoinColumn } from 'typeorm';
import { RfqItem } from './rfq-item.entity';
import { SteelSpecification } from '../../steel-specification/entities/steel-specification.entity';
import { ApiProperty } from '@nestjs/swagger';

export enum LengthUnit {
  METERS = 'meters',
  FEET = 'feet',
}

export enum QuantityType {
  TOTAL_LENGTH = 'total_length',
  NUMBER_OF_PIPES = 'number_of_pipes',
}

export enum ScheduleType {
  SCHEDULE = 'schedule',
  WALL_THICKNESS = 'wall_thickness',
}

@Entity('straight_pipe_rfqs')
export class StraightPipeRfq {
  @ApiProperty({ description: 'Primary key', example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'Nominal bore in mm', example: 500 })
  @Column({ name: 'nominal_bore_mm', type: 'decimal', precision: 8, scale: 3 })
  nominalBoreMm: number;

  @ApiProperty({ description: 'Schedule type - using schedule number or wall thickness', enum: ScheduleType })
  @Column({ name: 'schedule_type', type: 'enum', enum: ScheduleType })
  scheduleType: ScheduleType;

  @ApiProperty({ description: 'Schedule number (e.g., Sch20, Sch40)', required: false })
  @Column({ name: 'schedule_number', nullable: true })
  scheduleNumber?: string;

  @ApiProperty({ description: 'Wall thickness in mm (if not using schedule)', required: false })
  @Column({ name: 'wall_thickness_mm', type: 'decimal', precision: 8, scale: 3, nullable: true })
  wallThicknessMm?: number;

  @ApiProperty({ description: 'Pipe end configuration', example: 'FBE', required: false })
  @Column({ name: 'pipe_end_configuration', nullable: true })
  pipeEndConfiguration?: string;

  @ApiProperty({ description: 'Individual pipe length', example: 12.192 })
  @Column({ name: 'individual_pipe_length', type: 'decimal', precision: 8, scale: 3 })
  individualPipeLength: number;

  @ApiProperty({ description: 'Length unit', enum: LengthUnit })
  @Column({ name: 'length_unit', type: 'enum', enum: LengthUnit })
  lengthUnit: LengthUnit;

  @ApiProperty({ description: 'Quantity type - total length or number of pipes', enum: QuantityType })
  @Column({ name: 'quantity_type', type: 'enum', enum: QuantityType })
  quantityType: QuantityType;

  @ApiProperty({ description: 'Quantity value - total meters or number of pipes', example: 8000 })
  @Column({ name: 'quantity_value', type: 'decimal', precision: 10, scale: 3 })
  quantityValue: number;

  @ApiProperty({ description: 'Working pressure in bar', example: 10 })
  @Column({ name: 'working_pressure_bar', type: 'decimal', precision: 8, scale: 2 })
  workingPressureBar: number;

  @ApiProperty({ description: 'Working temperature in celsius', required: false })
  @Column({ name: 'working_temperature_c', type: 'decimal', precision: 8, scale: 2, nullable: true })
  workingTemperatureC?: number;

  // Calculated fields
  @ApiProperty({ description: 'Calculated outside diameter in mm', required: false })
  @Column({ name: 'calculated_od_mm', type: 'decimal', precision: 8, scale: 3, nullable: true })
  calculatedOdMm?: number;

  @ApiProperty({ description: 'Calculated wall thickness in mm', required: false })
  @Column({ name: 'calculated_wt_mm', type: 'decimal', precision: 8, scale: 3, nullable: true })
  calculatedWtMm?: number;

  @ApiProperty({ description: 'Calculated pipe weight per meter in kg', required: false })
  @Column({ name: 'pipe_weight_per_meter', type: 'decimal', precision: 10, scale: 3, nullable: true })
  pipeWeightPerMeterKg?: number;

  @ApiProperty({ description: 'Calculated total pipe weight in kg', required: false })
  @Column({ name: 'total_pipe_weight', type: 'decimal', precision: 12, scale: 2, nullable: true })
  totalPipeWeightKg?: number;

  @ApiProperty({ description: 'Calculated number of pipes', required: false })
  @Column({ name: 'calculated_pipe_count', type: 'int', nullable: true })
  calculatedPipeCount?: number;

  @ApiProperty({ description: 'Calculated total length in meters', required: false })
  @Column({ name: 'calculated_total_length', type: 'decimal', precision: 10, scale: 3, nullable: true })
  calculatedTotalLengthM?: number;

  @ApiProperty({ description: 'Number of flanges required', required: false })
  @Column({ name: 'number_of_flanges', type: 'int', nullable: true })
  numberOfFlanges?: number;

  @ApiProperty({ description: 'Number of butt welds required', required: false })
  @Column({ name: 'number_of_butt_welds', type: 'int', nullable: true })
  numberOfButtWelds?: number;

  @ApiProperty({ description: 'Total butt weld length in meters', required: false })
  @Column({ name: 'total_butt_weld_length', type: 'decimal', precision: 10, scale: 3, nullable: true })
  totalButtWeldLengthM?: number;

  @ApiProperty({ description: 'Number of flange welds required', required: false })
  @Column({ name: 'number_of_flange_welds', type: 'int', nullable: true })
  numberOfFlangeWelds?: number;

  @ApiProperty({ description: 'Total flange weld length in meters', required: false })
  @Column({ name: 'total_flange_weld_length', type: 'decimal', precision: 10, scale: 3, nullable: true })
  totalFlangeWeldLengthM?: number;

  // Relationships
  @ApiProperty({ description: 'Parent RFQ item', type: () => RfqItem })
  @OneToOne(() => RfqItem, (rfqItem) => rfqItem.straightPipeDetails, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'rfq_item_id' })
  rfqItem: RfqItem;

  @ApiProperty({ description: 'Steel specification', required: false })
  @ManyToOne(() => SteelSpecification, { nullable: true })
  @JoinColumn({ name: 'steel_specification_id' })
  steelSpecification?: SteelSpecification;
}
