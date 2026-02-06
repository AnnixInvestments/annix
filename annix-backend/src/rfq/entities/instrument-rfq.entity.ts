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

export enum InstrumentCategory {
  FLOW = 'flow',
  PRESSURE = 'pressure',
  LEVEL = 'level',
  TEMPERATURE = 'temperature',
  ANALYTICAL = 'analytical',
}

@Entity('instrument_rfqs')
export class InstrumentRfq {
  @ApiProperty({ description: 'Primary key', example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'Instrument type', example: 'mag_flowmeter' })
  @Column({ name: 'instrument_type', type: 'varchar', length: 100 })
  instrumentType: string;

  @ApiProperty({ description: 'Instrument category', enum: InstrumentCategory })
  @Column({
    name: 'instrument_category',
    type: 'enum',
    enum: InstrumentCategory,
  })
  instrumentCategory: InstrumentCategory;

  @ApiProperty({ description: 'Size in DN', example: '100' })
  @Column({ name: 'size', type: 'varchar', length: 20, nullable: true })
  size?: string;

  @ApiProperty({ description: 'Process connection type' })
  @Column({ name: 'process_connection', type: 'varchar', length: 50 })
  processConnection: string;

  @ApiProperty({ description: 'Wetted parts material' })
  @Column({ name: 'wetted_material', type: 'varchar', length: 50 })
  wettedMaterial: string;

  @ApiProperty({ description: 'Measurement range minimum' })
  @Column({
    name: 'range_min',
    type: 'decimal',
    precision: 15,
    scale: 4,
    nullable: true,
  })
  rangeMin?: number;

  @ApiProperty({ description: 'Measurement range maximum' })
  @Column({
    name: 'range_max',
    type: 'decimal',
    precision: 15,
    scale: 4,
    nullable: true,
  })
  rangeMax?: number;

  @ApiProperty({ description: 'Range unit', example: 'm3_h' })
  @Column({ name: 'range_unit', type: 'varchar', length: 30, nullable: true })
  rangeUnit?: string;

  @ApiProperty({ description: 'Output signal type', example: '4_20ma' })
  @Column({
    name: 'output_signal',
    type: 'varchar',
    length: 50,
    default: '4_20ma',
  })
  outputSignal: string;

  @ApiProperty({
    description: 'Communication protocol',
    example: '4_20ma_hart',
  })
  @Column({
    name: 'communication_protocol',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  communicationProtocol?: string;

  @ApiProperty({ description: 'Display type', example: 'local_lcd' })
  @Column({
    name: 'display_type',
    type: 'varchar',
    length: 50,
    default: 'local_lcd',
  })
  displayType: string;

  @ApiProperty({ description: 'Power supply type', example: 'loop_powered' })
  @Column({
    name: 'power_supply',
    type: 'varchar',
    length: 50,
    default: 'loop_powered',
  })
  powerSupply: string;

  @ApiProperty({ description: 'Cable entry type', example: 'm20' })
  @Column({
    name: 'cable_entry',
    type: 'varchar',
    length: 30,
    default: 'm20',
  })
  cableEntry: string;

  @ApiProperty({
    description: 'Explosion proof classification',
    example: 'ex_ia',
  })
  @Column({
    name: 'explosion_proof',
    type: 'varchar',
    length: 50,
    default: 'none',
  })
  explosionProof: string;

  @ApiProperty({ description: 'IP rating', example: 'ip65' })
  @Column({
    name: 'ip_rating',
    type: 'varchar',
    length: 20,
    default: 'ip65',
  })
  ipRating: string;

  @ApiProperty({ description: 'Accuracy class', example: 'class_0_5' })
  @Column({
    name: 'accuracy_class',
    type: 'varchar',
    length: 30,
    nullable: true,
  })
  accuracyClass?: string;

  @ApiProperty({ description: 'Calibration type', example: 'standard' })
  @Column({
    name: 'calibration',
    type: 'varchar',
    length: 50,
    default: 'standard',
  })
  calibration: string;

  @ApiProperty({ description: 'Process media' })
  @Column({ name: 'process_media', type: 'varchar', length: 255 })
  processMedia: string;

  @ApiProperty({ description: 'Operating pressure in bar' })
  @Column({
    name: 'operating_pressure',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  operatingPressure?: number;

  @ApiProperty({ description: 'Operating temperature in Celsius' })
  @Column({
    name: 'operating_temp',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  operatingTemp?: number;

  @ApiProperty({ description: 'Quantity value', example: 1 })
  @Column({
    name: 'quantity_value',
    type: 'int',
    default: 1,
  })
  quantityValue: number;

  @ApiProperty({ description: 'Supplier reference' })
  @Column({
    name: 'supplier_reference',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  supplierReference?: string;

  @ApiProperty({ description: 'Model number' })
  @Column({
    name: 'model_number',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  modelNumber?: string;

  @ApiProperty({ description: 'Unit cost from supplier' })
  @Column({
    name: 'unit_cost_from_supplier',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  unitCostFromSupplier?: number;

  @ApiProperty({ description: 'Markup percentage', example: 15.0 })
  @Column({
    name: 'markup_percentage',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 15.0,
  })
  markupPercentage: number;

  @ApiProperty({ description: 'Unit cost in Rand' })
  @Column({
    name: 'unit_cost',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  unitCost?: number;

  @ApiProperty({ description: 'Total cost in Rand' })
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

  @OneToOne(() => RfqItem, (rfqItem) => rfqItem.instrumentDetails)
  @JoinColumn({ name: 'rfq_item_id' })
  rfqItem: RfqItem;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
