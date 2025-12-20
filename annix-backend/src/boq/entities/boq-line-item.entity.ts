import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  Index,
} from 'typeorm';
import { Boq } from './boq.entity';
import { ApiProperty } from '@nestjs/swagger';

export enum BoqItemType {
  STRAIGHT_PIPE = 'straight_pipe',
  BEND = 'bend',
  FITTING = 'fitting',
  FLANGE = 'flange',
  VALVE = 'valve',
  SUPPORT = 'support',
  COATING = 'coating',
  LINING = 'lining',
  CUSTOM = 'custom',
}

@Entity('boq_line_items')
@Index(['boq'])
export class BoqLineItem {
  @ApiProperty({ description: 'Primary key', example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'Parent BOQ', type: () => Boq })
  @ManyToOne(() => Boq, (boq) => boq.lineItems, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'boq_id' })
  boq: Boq;

  @ApiProperty({ description: 'Line number in the BOQ', example: 1 })
  @Column({ name: 'line_number' })
  lineNumber: number;

  @ApiProperty({ description: 'Item code/reference', required: false })
  @Column({ name: 'item_code', length: 100, nullable: true })
  itemCode?: string;

  @ApiProperty({ description: 'Item description', example: '500NB Sch40 Carbon Steel Pipe' })
  @Column({ name: 'description', length: 500 })
  description: string;

  @ApiProperty({ description: 'Item type', enum: BoqItemType })
  @Column({ name: 'item_type', type: 'enum', enum: BoqItemType })
  itemType: BoqItemType;

  @ApiProperty({ description: 'Unit of measure', example: 'meters' })
  @Column({ name: 'unit_of_measure', length: 50 })
  unitOfMeasure: string;

  @ApiProperty({ description: 'Quantity', example: 100.5 })
  @Column({ name: 'quantity', type: 'decimal', precision: 12, scale: 3 })
  quantity: number;

  @ApiProperty({ description: 'Unit weight in kg', required: false })
  @Column({ name: 'unit_weight_kg', type: 'decimal', precision: 10, scale: 3, nullable: true })
  unitWeightKg?: number;

  @ApiProperty({ description: 'Total weight in kg', required: false })
  @Column({ name: 'total_weight_kg', type: 'decimal', precision: 12, scale: 2, nullable: true })
  totalWeightKg?: number;

  @ApiProperty({ description: 'Unit price', required: false })
  @Column({ name: 'unit_price', type: 'decimal', precision: 15, scale: 2, nullable: true })
  unitPrice?: number;

  @ApiProperty({ description: 'Total price', required: false })
  @Column({ name: 'total_price', type: 'decimal', precision: 15, scale: 2, nullable: true })
  totalPrice?: number;

  @ApiProperty({ description: 'Additional notes', required: false })
  @Column({ name: 'notes', type: 'text', nullable: true })
  notes?: string;

  @ApiProperty({ description: 'Reference to drawing location', required: false })
  @Column({ name: 'drawing_reference', length: 100, nullable: true })
  drawingReference?: string;

  @ApiProperty({ description: 'Additional specifications as JSON', required: false })
  @Column({ name: 'specifications', type: 'jsonb', nullable: true })
  specifications?: Record<string, any>;

  @ApiProperty({ description: 'Creation date' })
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update date' })
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
