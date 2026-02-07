import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { SupplierProfile } from '../../supplier/entities/supplier-profile.entity';

export enum PumpProductStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DISCONTINUED = 'discontinued',
}

export enum PumpProductCategory {
  CENTRIFUGAL = 'centrifugal',
  POSITIVE_DISPLACEMENT = 'positive_displacement',
  SPECIALTY = 'specialty',
}

@Entity('pump_products')
export class PumpProduct {
  @ApiProperty({ description: 'Primary key', example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'Product SKU/code', example: 'PMP-KSB-001' })
  @Column({ name: 'sku', type: 'varchar', length: 50, unique: true })
  sku: string;

  @ApiProperty({ description: 'Product title', example: 'KSB Etanorm 50-200' })
  @Column({ name: 'title', type: 'varchar', length: 200 })
  title: string;

  @ApiProperty({ description: 'Product description' })
  @Column({ name: 'description', type: 'text', nullable: true })
  description: string | null;

  @ApiProperty({ description: 'Pump type code', example: 'centrifugal_end_suction' })
  @Column({ name: 'pump_type', type: 'varchar', length: 100 })
  pumpType: string;

  @ApiProperty({ description: 'Pump category', enum: PumpProductCategory })
  @Column({
    name: 'category',
    type: 'enum',
    enum: PumpProductCategory,
  })
  category: PumpProductCategory;

  @ApiProperty({ description: 'Product status', enum: PumpProductStatus })
  @Column({
    name: 'status',
    type: 'enum',
    enum: PumpProductStatus,
    default: PumpProductStatus.ACTIVE,
  })
  status: PumpProductStatus;

  @ApiProperty({ description: 'Manufacturer name', example: 'KSB' })
  @Column({ name: 'manufacturer', type: 'varchar', length: 100 })
  manufacturer: string;

  @ApiProperty({ description: 'Manufacturer model/part number' })
  @Column({ name: 'model_number', type: 'varchar', length: 100, nullable: true })
  modelNumber: string | null;

  @ApiProperty({ description: 'API 610 pump type classification' })
  @Column({ name: 'api_610_type', type: 'varchar', length: 20, nullable: true })
  api610Type: string | null;

  @ApiProperty({ description: 'Minimum flow rate in m³/h' })
  @Column({
    name: 'flow_rate_min',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  flowRateMin: number | null;

  @ApiProperty({ description: 'Maximum flow rate in m³/h' })
  @Column({
    name: 'flow_rate_max',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  flowRateMax: number | null;

  @ApiProperty({ description: 'Minimum head in meters' })
  @Column({
    name: 'head_min',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  headMin: number | null;

  @ApiProperty({ description: 'Maximum head in meters' })
  @Column({
    name: 'head_max',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  headMax: number | null;

  @ApiProperty({ description: 'Maximum operating temperature in Celsius' })
  @Column({
    name: 'max_temperature',
    type: 'decimal',
    precision: 6,
    scale: 2,
    nullable: true,
  })
  maxTemperature: number | null;

  @ApiProperty({ description: 'Maximum operating pressure in bar' })
  @Column({
    name: 'max_pressure',
    type: 'decimal',
    precision: 8,
    scale: 2,
    nullable: true,
  })
  maxPressure: number | null;

  @ApiProperty({ description: 'Suction size DN' })
  @Column({ name: 'suction_size', type: 'varchar', length: 20, nullable: true })
  suctionSize: string | null;

  @ApiProperty({ description: 'Discharge size DN' })
  @Column({ name: 'discharge_size', type: 'varchar', length: 20, nullable: true })
  dischargeSize: string | null;

  @ApiProperty({ description: 'Default casing material' })
  @Column({ name: 'casing_material', type: 'varchar', length: 50, nullable: true })
  casingMaterial: string | null;

  @ApiProperty({ description: 'Default impeller material' })
  @Column({ name: 'impeller_material', type: 'varchar', length: 50, nullable: true })
  impellerMaterial: string | null;

  @ApiProperty({ description: 'Default shaft material' })
  @Column({ name: 'shaft_material', type: 'varchar', length: 50, nullable: true })
  shaftMaterial: string | null;

  @ApiProperty({ description: 'Default seal type' })
  @Column({ name: 'seal_type', type: 'varchar', length: 50, nullable: true })
  sealType: string | null;

  @ApiProperty({ description: 'Motor power in kW' })
  @Column({
    name: 'motor_power_kw',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  motorPowerKw: number | null;

  @ApiProperty({ description: 'Default voltage' })
  @Column({ name: 'voltage', type: 'varchar', length: 20, nullable: true })
  voltage: string | null;

  @ApiProperty({ description: 'Default frequency' })
  @Column({ name: 'frequency', type: 'varchar', length: 10, nullable: true })
  frequency: string | null;

  @ApiProperty({ description: 'Weight in kg' })
  @Column({
    name: 'weight_kg',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  weightKg: number | null;

  @ApiProperty({ description: 'Certifications as array' })
  @Column({
    name: 'certifications',
    type: 'text',
    array: true,
    default: '{}',
  })
  certifications: string[];

  @ApiProperty({ description: 'Suitable applications as array' })
  @Column({
    name: 'applications',
    type: 'text',
    array: true,
    default: '{}',
  })
  applications: string[];

  @ApiProperty({ description: 'Base cost from supplier in ZAR' })
  @Column({
    name: 'base_cost',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  baseCost: number | null;

  @ApiProperty({ description: 'List price in ZAR' })
  @Column({
    name: 'list_price',
    type: 'decimal',
    precision: 12,
    scale: 2,
    nullable: true,
  })
  listPrice: number | null;

  @ApiProperty({ description: 'Default markup percentage', example: 15.0 })
  @Column({
    name: 'markup_percentage',
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 15.0,
  })
  markupPercentage: number;

  @ApiProperty({ description: 'Lead time in days' })
  @Column({ name: 'lead_time_days', type: 'int', nullable: true })
  leadTimeDays: number | null;

  @ApiProperty({ description: 'Stock available' })
  @Column({ name: 'stock_quantity', type: 'int', default: 0 })
  stockQuantity: number;

  @ApiProperty({ description: 'Datasheet URL' })
  @Column({ name: 'datasheet_url', type: 'varchar', length: 500, nullable: true })
  datasheetUrl: string | null;

  @ApiProperty({ description: 'Image URL' })
  @Column({ name: 'image_url', type: 'varchar', length: 500, nullable: true })
  imageUrl: string | null;

  @ApiProperty({ description: 'Technical specifications as JSON' })
  @Column({ name: 'specifications', type: 'jsonb', nullable: true })
  specifications: Record<string, any> | null;

  @ApiProperty({ description: 'Pump curve data as JSON' })
  @Column({ name: 'pump_curve_data', type: 'jsonb', nullable: true })
  pumpCurveData: Record<string, any> | null;

  @ApiProperty({ description: 'Notes' })
  @Column({ name: 'notes', type: 'text', nullable: true })
  notes: string | null;

  @ManyToOne(() => SupplierProfile, { nullable: true })
  @JoinColumn({ name: 'supplier_id' })
  supplier: SupplierProfile | null;

  @Column({ name: 'supplier_id', type: 'int', nullable: true })
  supplierId: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
