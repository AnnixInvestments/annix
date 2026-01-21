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

export enum ExpansionJointType {
  BOUGHT_IN_BELLOWS = 'bought_in_bellows',
  FABRICATED_LOOP = 'fabricated_loop',
}

export enum BellowsJointType {
  AXIAL = 'axial',
  UNIVERSAL = 'universal',
  HINGED = 'hinged',
  GIMBAL = 'gimbal',
  TIED_UNIVERSAL = 'tied_universal',
}

export enum BellowsMaterial {
  STAINLESS_STEEL_304 = 'stainless_steel_304',
  STAINLESS_STEEL_316 = 'stainless_steel_316',
  RUBBER_EPDM = 'rubber_epdm',
  RUBBER_NEOPRENE = 'rubber_neoprene',
  PTFE = 'ptfe',
  FABRIC_REINFORCED = 'fabric_reinforced',
}

export enum FabricatedLoopType {
  FULL_LOOP = 'full_loop',
  HORSESHOE_LYRE = 'horseshoe_lyre',
  Z_OFFSET = 'z_offset',
  L_OFFSET = 'l_offset',
}

@Entity('expansion_joint_rfqs')
export class ExpansionJointRfq {
  @ApiProperty({ description: 'Primary key', example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({
    description: 'Type of expansion joint',
    enum: ExpansionJointType,
  })
  @Column({
    name: 'expansion_joint_type',
    type: 'enum',
    enum: ExpansionJointType,
  })
  expansionJointType: ExpansionJointType;

  @ApiProperty({ description: 'Nominal diameter in mm', example: 200 })
  @Column({
    name: 'nominal_diameter_mm',
    type: 'decimal',
    precision: 10,
    scale: 2,
  })
  nominalDiameterMm: number;

  @ApiProperty({ description: 'Schedule number', example: 'Sch40' })
  @Column({
    name: 'schedule_number',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  scheduleNumber?: string;

  @ApiProperty({ description: 'Wall thickness in mm' })
  @Column({
    name: 'wall_thickness_mm',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  wallThicknessMm?: number;

  @ApiProperty({ description: 'Outside diameter in mm' })
  @Column({
    name: 'outside_diameter_mm',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  outsideDiameterMm?: number;

  @ApiProperty({ description: 'Quantity value', example: 1 })
  @Column({
    name: 'quantity_value',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 1,
  })
  quantityValue: number;

  @ApiProperty({
    description: 'Bellows joint type (for bought-in)',
    enum: BellowsJointType,
  })
  @Column({
    name: 'bellows_joint_type',
    type: 'enum',
    enum: BellowsJointType,
    nullable: true,
  })
  bellowsJointType?: BellowsJointType;

  @ApiProperty({
    description: 'Bellows material (for bought-in)',
    enum: BellowsMaterial,
  })
  @Column({
    name: 'bellows_material',
    type: 'enum',
    enum: BellowsMaterial,
    nullable: true,
  })
  bellowsMaterial?: BellowsMaterial;

  @ApiProperty({ description: 'Axial movement in mm' })
  @Column({
    name: 'axial_movement_mm',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  axialMovementMm?: number;

  @ApiProperty({ description: 'Lateral movement in mm' })
  @Column({
    name: 'lateral_movement_mm',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  lateralMovementMm?: number;

  @ApiProperty({ description: 'Angular movement in degrees' })
  @Column({
    name: 'angular_movement_deg',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  angularMovementDeg?: number;

  @ApiProperty({ description: 'Supplier reference' })
  @Column({
    name: 'supplier_reference',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  supplierReference?: string;

  @ApiProperty({ description: 'Catalog number' })
  @Column({
    name: 'catalog_number',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  catalogNumber?: string;

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

  @ApiProperty({
    description: 'Fabricated loop type',
    enum: FabricatedLoopType,
  })
  @Column({
    name: 'loop_type',
    type: 'enum',
    enum: FabricatedLoopType,
    nullable: true,
  })
  loopType?: FabricatedLoopType;

  @ApiProperty({ description: 'Loop height in mm' })
  @Column({
    name: 'loop_height_mm',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  loopHeightMm?: number;

  @ApiProperty({ description: 'Loop width in mm' })
  @Column({
    name: 'loop_width_mm',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  loopWidthMm?: number;

  @ApiProperty({ description: 'Total pipe length in mm' })
  @Column({
    name: 'pipe_length_total_mm',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  pipeLengthTotalMm?: number;

  @ApiProperty({ description: 'Number of elbows' })
  @Column({
    name: 'number_of_elbows',
    type: 'int',
    nullable: true,
  })
  numberOfElbows?: number;

  @ApiProperty({ description: 'End configuration' })
  @Column({
    name: 'end_configuration',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  endConfiguration?: string;

  @ApiProperty({ description: 'Total weight in kg' })
  @Column({
    name: 'total_weight_kg',
    type: 'decimal',
    precision: 10,
    scale: 3,
    nullable: true,
  })
  totalWeightKg?: number;

  @ApiProperty({ description: 'Pipe weight in kg' })
  @Column({
    name: 'pipe_weight_kg',
    type: 'decimal',
    precision: 10,
    scale: 3,
    nullable: true,
  })
  pipeWeightKg?: number;

  @ApiProperty({ description: 'Elbow weight in kg' })
  @Column({
    name: 'elbow_weight_kg',
    type: 'decimal',
    precision: 10,
    scale: 3,
    nullable: true,
  })
  elbowWeightKg?: number;

  @ApiProperty({ description: 'Flange weight in kg' })
  @Column({
    name: 'flange_weight_kg',
    type: 'decimal',
    precision: 10,
    scale: 3,
    nullable: true,
  })
  flangeWeightKg?: number;

  @ApiProperty({ description: 'Number of butt welds' })
  @Column({
    name: 'number_of_butt_welds',
    type: 'int',
    nullable: true,
  })
  numberOfButtWelds?: number;

  @ApiProperty({ description: 'Total butt weld length in meters' })
  @Column({
    name: 'total_butt_weld_length_m',
    type: 'decimal',
    precision: 10,
    scale: 3,
    nullable: true,
  })
  totalButtWeldLengthM?: number;

  @ApiProperty({ description: 'Number of flange welds' })
  @Column({
    name: 'number_of_flange_welds',
    type: 'int',
    nullable: true,
  })
  numberOfFlangeWelds?: number;

  @ApiProperty({ description: 'Flange weld length in meters' })
  @Column({
    name: 'flange_weld_length_m',
    type: 'decimal',
    precision: 10,
    scale: 3,
    nullable: true,
  })
  flangeWeldLengthM?: number;

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

  @OneToOne(() => RfqItem, (rfqItem) => rfqItem.expansionJointDetails)
  @JoinColumn({ name: 'rfq_item_id' })
  rfqItem: RfqItem;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
