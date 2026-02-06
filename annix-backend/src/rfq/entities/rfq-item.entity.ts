import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Rfq } from './rfq.entity';
import { StraightPipeRfq } from './straight-pipe-rfq.entity';
import { BendRfq } from './bend-rfq.entity';
import { FittingRfq } from './fitting-rfq.entity';
import { PipeSteelWorkRfq } from './pipe-steel-work-rfq.entity';
import { ExpansionJointRfq } from './expansion-joint-rfq.entity';
import { ValveRfq } from './valve-rfq.entity';
import { InstrumentRfq } from './instrument-rfq.entity';
import { PumpRfq } from './pump-rfq.entity';
import { ApiProperty } from '@nestjs/swagger';

export enum RfqItemType {
  STRAIGHT_PIPE = 'straight_pipe',
  BEND = 'bend',
  FITTING = 'fitting',
  FLANGE = 'flange',
  CUSTOM = 'custom',
  PIPE_STEEL_WORK = 'pipe_steel_work',
  EXPANSION_JOINT = 'expansion_joint',
  VALVE = 'valve',
  INSTRUMENT = 'instrument',
  PUMP = 'pump',
}

@Entity('rfq_items')
export class RfqItem {
  @ApiProperty({ description: 'Primary key', example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'Line number in the RFQ', example: 1 })
  @Column({ name: 'line_number', type: 'int' })
  lineNumber: number;

  @ApiProperty({
    description: 'Item description',
    example: '500NB Sch20 Straight Pipe for 10 Bar Pipeline',
  })
  @Column({ name: 'description' })
  description: string;

  @ApiProperty({ description: 'Type of RFQ item', enum: RfqItemType })
  @Column({ name: 'item_type', type: 'enum', enum: RfqItemType })
  itemType: RfqItemType;

  @ApiProperty({ description: 'Quantity required', example: 656 })
  @Column({ name: 'quantity', type: 'int' })
  quantity: number;

  @ApiProperty({
    description: 'Estimated weight per unit in kg',
    required: false,
  })
  @Column({
    name: 'weight_per_unit_kg',
    type: 'decimal',
    precision: 10,
    scale: 3,
    nullable: true,
  })
  weightPerUnitKg?: number;

  @ApiProperty({ description: 'Total estimated weight in kg', required: false })
  @Column({
    name: 'total_weight_kg',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  totalWeightKg?: number;

  @ApiProperty({ description: 'Unit price', required: false })
  @Column({
    name: 'unit_price',
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: true,
  })
  unitPrice?: number;

  @ApiProperty({ description: 'Total price', required: false })
  @Column({
    name: 'total_price',
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: true,
  })
  totalPrice?: number;

  @ApiProperty({ description: 'Additional notes', required: false })
  @Column({ name: 'notes', type: 'text', nullable: true })
  notes?: string;

  @ApiProperty({ description: 'Parent RFQ', type: () => Rfq })
  @ManyToOne(() => Rfq, (rfq) => rfq.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'rfq_id' })
  rfq: Rfq;

  @ApiProperty({
    description: 'Straight pipe details (if item type is straight_pipe)',
    required: false,
    type: () => StraightPipeRfq,
  })
  @OneToOne(() => StraightPipeRfq, (straightPipe) => straightPipe.rfqItem, {
    cascade: true,
    nullable: true,
  })
  straightPipeDetails?: StraightPipeRfq;

  @ApiProperty({
    description: 'Bend details (if item type is bend)',
    required: false,
    type: () => BendRfq,
  })
  @OneToOne(() => BendRfq, (bend) => bend.rfqItem, {
    cascade: true,
    nullable: true,
  })
  bendDetails?: BendRfq;

  @ApiProperty({
    description: 'Fitting details (if item type is fitting)',
    required: false,
    type: () => FittingRfq,
  })
  @OneToOne(() => FittingRfq, (fitting) => fitting.rfqItem, {
    cascade: true,
    nullable: true,
  })
  fittingDetails?: FittingRfq;

  @ApiProperty({
    description: 'Pipe steel work details (if item type is pipe_steel_work)',
    required: false,
    type: () => PipeSteelWorkRfq,
  })
  @OneToOne(() => PipeSteelWorkRfq, (pipeSteelWork) => pipeSteelWork.rfqItem, {
    cascade: true,
    nullable: true,
  })
  pipeSteelWorkDetails?: PipeSteelWorkRfq;

  @ApiProperty({
    description: 'Expansion joint details (if item type is expansion_joint)',
    required: false,
    type: () => ExpansionJointRfq,
  })
  @OneToOne(
    () => ExpansionJointRfq,
    (expansionJoint) => expansionJoint.rfqItem,
    {
      cascade: true,
      nullable: true,
    },
  )
  expansionJointDetails?: ExpansionJointRfq;

  @ApiProperty({
    description: 'Valve details (if item type is valve)',
    required: false,
    type: () => ValveRfq,
  })
  @OneToOne(() => ValveRfq, (valve) => valve.rfqItem, {
    cascade: true,
    nullable: true,
  })
  valveDetails?: ValveRfq;

  @ApiProperty({
    description: 'Instrument details (if item type is instrument)',
    required: false,
    type: () => InstrumentRfq,
  })
  @OneToOne(() => InstrumentRfq, (instrument) => instrument.rfqItem, {
    cascade: true,
    nullable: true,
  })
  instrumentDetails?: InstrumentRfq;

  @ApiProperty({
    description: 'Pump details (if item type is pump)',
    required: false,
    type: () => PumpRfq,
  })
  @OneToOne(() => PumpRfq, (pump) => pump.rfqItem, {
    cascade: true,
    nullable: true,
  })
  pumpDetails?: PumpRfq;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
