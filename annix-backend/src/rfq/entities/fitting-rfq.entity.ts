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

@Entity('fitting_rfqs')
export class FittingRfq {
  @ApiProperty({ description: 'Primary key', example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'Nominal diameter in mm', example: 500 })
  @Column({ name: 'nominal_diameter_mm', type: 'decimal', precision: 10, scale: 3 })
  nominalDiameterMm: number;

  @ApiProperty({ description: 'Schedule number', example: 'WT6' })
  @Column({ name: 'schedule_number', type: 'varchar', length: 50 })
  scheduleNumber: string;

  @ApiProperty({ description: 'Wall thickness in mm', example: 6 })
  @Column({ name: 'wall_thickness_mm', type: 'decimal', precision: 10, scale: 3, nullable: true })
  wallThicknessMm?: number;

  @ApiProperty({ description: 'Fitting type', example: 'SHORT_TEE' })
  @Column({ name: 'fitting_type', type: 'varchar', length: 50 })
  fittingType: string;

  @ApiProperty({ description: 'Fitting standard', example: 'SABS719' })
  @Column({ name: 'fitting_standard', type: 'varchar', length: 50, nullable: true })
  fittingStandard?: string;

  @ApiProperty({ description: 'Pipe length A in mm', example: 1020 })
  @Column({ name: 'pipe_length_a_mm', type: 'decimal', precision: 10, scale: 3, nullable: true })
  pipeLengthAMm?: number;

  @ApiProperty({ description: 'Pipe length B in mm', example: 510 })
  @Column({ name: 'pipe_length_b_mm', type: 'decimal', precision: 10, scale: 3, nullable: true })
  pipeLengthBMm?: number;

  @ApiProperty({ description: 'Pipe end configuration', example: 'F2E_RF' })
  @Column({ name: 'pipe_end_configuration', type: 'varchar', length: 50, nullable: true })
  pipeEndConfiguration?: string;

  @ApiProperty({ description: 'Whether to add blank flange', example: true })
  @Column({ name: 'add_blank_flange', type: 'boolean', default: false })
  addBlankFlange: boolean;

  @ApiProperty({ description: 'Blank flange count', example: 1 })
  @Column({ name: 'blank_flange_count', type: 'int', nullable: true })
  blankFlangeCount?: number;

  @ApiProperty({ description: 'Blank flange positions as JSON array', example: '["inlet"]' })
  @Column({ name: 'blank_flange_positions', type: 'json', nullable: true })
  blankFlangePositions?: string[];

  @ApiProperty({ description: 'Quantity value', example: 1 })
  @Column({ name: 'quantity_value', type: 'decimal', precision: 10, scale: 2, default: 1 })
  quantityValue: number;

  @ApiProperty({ description: 'Quantity type', example: 'number_of_items' })
  @Column({ name: 'quantity_type', type: 'varchar', length: 50, default: 'number_of_items' })
  quantityType: string;

  @ApiProperty({ description: 'Working pressure in bar', example: 10 })
  @Column({ name: 'working_pressure_bar', type: 'decimal', precision: 6, scale: 2, nullable: true })
  workingPressureBar?: number;

  @ApiProperty({ description: 'Working temperature in Celsius', example: 50 })
  @Column({ name: 'working_temperature_c', type: 'decimal', precision: 5, scale: 2, nullable: true })
  workingTemperatureC?: number;

  @ApiProperty({ description: 'Total weight in kg', example: 125.52 })
  @Column({ name: 'total_weight_kg', type: 'decimal', precision: 10, scale: 3, nullable: true })
  totalWeightKg?: number;

  @ApiProperty({ description: 'Number of flanges', example: 3 })
  @Column({ name: 'number_of_flanges', type: 'int', nullable: true })
  numberOfFlanges?: number;

  @ApiProperty({ description: 'Number of flange welds', example: 3 })
  @Column({ name: 'number_of_flange_welds', type: 'int', nullable: true })
  numberOfFlangeWelds?: number;

  @ApiProperty({ description: 'Number of tee welds', example: 1 })
  @Column({ name: 'number_of_tee_welds', type: 'int', nullable: true })
  numberOfTeeWelds?: number;

  @ApiProperty({ description: 'Calculation data as JSON', required: false })
  @Column({ name: 'calculation_data', type: 'jsonb', nullable: true })
  calculationData?: Record<string, any>;

  @OneToOne(() => RfqItem, (rfqItem) => rfqItem.fittingDetails)
  @JoinColumn({ name: 'rfq_item_id' })
  rfqItem: RfqItem;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
