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

export enum PumpCategory {
  CENTRIFUGAL = 'centrifugal',
  POSITIVE_DISPLACEMENT = 'positive_displacement',
  SPECIALTY = 'specialty',
}

export enum PumpServiceType {
  NEW_PUMP = 'new_pump',
  SPARE_PARTS = 'spare_parts',
  REPAIR_SERVICE = 'repair_service',
  RENTAL = 'rental',
}

export enum PumpMotorType {
  ELECTRIC_AC = 'electric_ac',
  ELECTRIC_VFD = 'electric_vfd',
  DIESEL = 'diesel',
  HYDRAULIC = 'hydraulic',
  AIR = 'air',
  NONE = 'none',
}

export enum PumpSealType {
  GLAND_PACKING = 'gland_packing',
  MECHANICAL_SINGLE = 'mechanical_single',
  MECHANICAL_DOUBLE = 'mechanical_double',
  CARTRIDGE = 'cartridge',
  DRY_RUNNING = 'dry_running',
  MAGNETIC_DRIVE = 'magnetic_drive',
}

@Entity('pump_rfqs')
export class PumpRfq {
  @ApiProperty({ description: 'Primary key', example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'Service type', enum: PumpServiceType })
  @Column({
    name: 'service_type',
    type: 'enum',
    enum: PumpServiceType,
    default: PumpServiceType.NEW_PUMP,
  })
  serviceType: PumpServiceType;

  @ApiProperty({ description: 'Pump type', example: 'centrifugal_end_suction' })
  @Column({ name: 'pump_type', type: 'varchar', length: 100 })
  pumpType: string;

  @ApiProperty({ description: 'Pump category', enum: PumpCategory })
  @Column({
    name: 'pump_category',
    type: 'enum',
    enum: PumpCategory,
    nullable: true,
  })
  pumpCategory?: PumpCategory;

  @ApiProperty({ description: 'Flow rate in m³/h' })
  @Column({
    name: 'flow_rate',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  flowRate?: number;

  @ApiProperty({ description: 'Total dynamic head in meters' })
  @Column({
    name: 'total_head',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  totalHead?: number;

  @ApiProperty({ description: 'Suction head/lift in meters' })
  @Column({
    name: 'suction_head',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  suctionHead?: number;

  @ApiProperty({ description: 'NPSHa in meters' })
  @Column({
    name: 'npsh_available',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  npshAvailable?: number;

  @ApiProperty({ description: 'Discharge pressure in bar' })
  @Column({
    name: 'discharge_pressure',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  dischargePressure?: number;

  @ApiProperty({ description: 'Operating temperature in Celsius' })
  @Column({
    name: 'operating_temp',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  operatingTemp?: number;

  @ApiProperty({ description: 'Fluid type' })
  @Column({ name: 'fluid_type', type: 'varchar', length: 50 })
  fluidType: string;

  @ApiProperty({ description: 'Specific gravity' })
  @Column({
    name: 'specific_gravity',
    type: 'decimal',
    precision: 6,
    scale: 3,
    nullable: true,
  })
  specificGravity?: number;

  @ApiProperty({ description: 'Viscosity in cP' })
  @Column({
    name: 'viscosity',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  viscosity?: number;

  @ApiProperty({ description: 'Solids content percentage' })
  @Column({
    name: 'solids_content',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  solidsContent?: number;

  @ApiProperty({ description: 'Max solids size in mm' })
  @Column({
    name: 'solids_size',
    type: 'decimal',
    precision: 8,
    scale: 2,
    nullable: true,
  })
  solidsSize?: number;

  @ApiProperty({ description: 'pH level' })
  @Column({
    name: 'ph',
    type: 'decimal',
    precision: 4,
    scale: 2,
    nullable: true,
  })
  ph?: number;

  @ApiProperty({ description: 'Is fluid abrasive' })
  @Column({ name: 'is_abrasive', type: 'boolean', default: false })
  isAbrasive: boolean;

  @ApiProperty({ description: 'Is fluid corrosive' })
  @Column({ name: 'is_corrosive', type: 'boolean', default: false })
  isCorrosive: boolean;

  @ApiProperty({ description: 'Casing material' })
  @Column({ name: 'casing_material', type: 'varchar', length: 50 })
  casingMaterial: string;

  @ApiProperty({ description: 'Impeller material' })
  @Column({ name: 'impeller_material', type: 'varchar', length: 50 })
  impellerMaterial: string;

  @ApiProperty({ description: 'Shaft material' })
  @Column({ name: 'shaft_material', type: 'varchar', length: 50, nullable: true })
  shaftMaterial?: string;

  @ApiProperty({ description: 'Seal type', enum: PumpSealType })
  @Column({
    name: 'seal_type',
    type: 'enum',
    enum: PumpSealType,
    nullable: true,
  })
  sealType?: PumpSealType;

  @ApiProperty({ description: 'API 682 seal flush plan' })
  @Column({ name: 'seal_plan', type: 'varchar', length: 20, nullable: true })
  sealPlan?: string;

  @ApiProperty({ description: 'Suction size DN' })
  @Column({ name: 'suction_size', type: 'varchar', length: 20, nullable: true })
  suctionSize?: string;

  @ApiProperty({ description: 'Discharge size DN' })
  @Column({ name: 'discharge_size', type: 'varchar', length: 20, nullable: true })
  dischargeSize?: string;

  @ApiProperty({ description: 'Connection type' })
  @Column({ name: 'connection_type', type: 'varchar', length: 50, nullable: true })
  connectionType?: string;

  @ApiProperty({ description: 'Motor type', enum: PumpMotorType })
  @Column({
    name: 'motor_type',
    type: 'enum',
    enum: PumpMotorType,
    default: PumpMotorType.ELECTRIC_AC,
  })
  motorType: PumpMotorType;

  @ApiProperty({ description: 'Motor power in kW' })
  @Column({
    name: 'motor_power',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  motorPower?: number;

  @ApiProperty({ description: 'Voltage' })
  @Column({ name: 'voltage', type: 'varchar', length: 20, nullable: true })
  voltage?: string;

  @ApiProperty({ description: 'Frequency' })
  @Column({ name: 'frequency', type: 'varchar', length: 10, nullable: true })
  frequency?: string;

  @ApiProperty({ description: 'Motor efficiency class' })
  @Column({ name: 'motor_efficiency', type: 'varchar', length: 10, nullable: true })
  motorEfficiency?: string;

  @ApiProperty({ description: 'Motor enclosure type' })
  @Column({ name: 'enclosure', type: 'varchar', length: 50, nullable: true })
  enclosure?: string;

  @ApiProperty({ description: 'Hazardous area classification' })
  @Column({
    name: 'hazardous_area',
    type: 'varchar',
    length: 50,
    default: 'none',
  })
  hazardousArea: string;

  @ApiProperty({ description: 'Certifications as array' })
  @Column({
    name: 'certifications',
    type: 'text',
    array: true,
    default: '{}',
  })
  certifications: string[];

  @ApiProperty({ description: 'Spare part category (for spare parts service)' })
  @Column({ name: 'spare_part_category', type: 'varchar', length: 50, nullable: true })
  sparePartCategory?: string;

  @ApiProperty({ description: 'Spare parts list as JSON (for spare parts service)' })
  @Column({ name: 'spare_parts', type: 'jsonb', nullable: true })
  spareParts?: Record<string, any>[];

  @ApiProperty({ description: 'Existing pump make/model (for parts/repair)' })
  @Column({ name: 'existing_pump_model', type: 'varchar', length: 255, nullable: true })
  existingPumpModel?: string;

  @ApiProperty({ description: 'Existing pump serial number' })
  @Column({ name: 'existing_pump_serial', type: 'varchar', length: 100, nullable: true })
  existingPumpSerial?: string;

  @ApiProperty({ description: 'Rental duration in days (for rental)' })
  @Column({ name: 'rental_duration_days', type: 'int', nullable: true })
  rentalDurationDays?: number;

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

  @OneToOne(() => RfqItem, (rfqItem) => rfqItem.pumpDetails)
  @JoinColumn({ name: 'rfq_item_id' })
  rfqItem: RfqItem;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
