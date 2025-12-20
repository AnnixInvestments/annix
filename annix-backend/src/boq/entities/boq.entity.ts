import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Rfq } from '../../rfq/entities/rfq.entity';
import { Drawing } from '../../drawings/entities/drawing.entity';
import { BoqLineItem } from './boq-line-item.entity';
import { ApiProperty } from '@nestjs/swagger';

export enum BoqStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  UNDER_REVIEW = 'under_review',
  CHANGES_REQUESTED = 'changes_requested',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('boqs')
@Index(['status'])
export class Boq {
  @ApiProperty({ description: 'Primary key', example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'Auto-generated BOQ number', example: 'BOQ-2025-0001' })
  @Column({ name: 'boq_number', length: 50, unique: true })
  boqNumber: string;

  @ApiProperty({ description: 'BOQ title', example: 'Pipeline Section A - Materials List' })
  @Column({ name: 'title', length: 255 })
  title: string;

  @ApiProperty({ description: 'BOQ description', required: false })
  @Column({ name: 'description', type: 'text', nullable: true })
  description?: string;

  @ApiProperty({ description: 'BOQ status', enum: BoqStatus })
  @Column({ name: 'status', type: 'enum', enum: BoqStatus, default: BoqStatus.DRAFT })
  status: BoqStatus;

  @ApiProperty({ description: 'Associated drawing', type: () => Drawing, required: false })
  @ManyToOne(() => Drawing, { nullable: true })
  @JoinColumn({ name: 'drawing_id' })
  drawing?: Drawing;

  @ApiProperty({ description: 'Associated RFQ', type: () => Rfq, required: false })
  @ManyToOne(() => Rfq, (rfq) => rfq.boqs, { nullable: true })
  @JoinColumn({ name: 'rfq_id' })
  rfq?: Rfq;

  @ApiProperty({ description: 'User who created the BOQ', type: () => User })
  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by_user_id' })
  createdBy: User;

  @ApiProperty({ description: 'Line items', type: () => [BoqLineItem] })
  @OneToMany(() => BoqLineItem, (item) => item.boq, { cascade: true })
  lineItems: BoqLineItem[];

  @ApiProperty({ description: 'Total quantity', required: false })
  @Column({ name: 'total_quantity', type: 'decimal', precision: 12, scale: 3, nullable: true })
  totalQuantity?: number;

  @ApiProperty({ description: 'Total weight in kg', required: false })
  @Column({ name: 'total_weight_kg', type: 'decimal', precision: 12, scale: 2, nullable: true })
  totalWeightKg?: number;

  @ApiProperty({ description: 'Total estimated cost', required: false })
  @Column({ name: 'total_estimated_cost', type: 'decimal', precision: 15, scale: 2, nullable: true })
  totalEstimatedCost?: number;

  @ApiProperty({ description: 'Creation date' })
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update date' })
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
