import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne, CreateDateColumn, UpdateDateColumn, JoinColumn } from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { RfqItem } from './rfq-item.entity';
import { Drawing } from '../../drawings/entities/drawing.entity';
import { Boq } from '../../boq/entities/boq.entity';
import { ApiProperty } from '@nestjs/swagger';

export enum RfqStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  QUOTED = 'quoted',
  ACCEPTED = 'accepted',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

@Entity('rfqs')
export class Rfq {
  @ApiProperty({ description: 'Primary key', example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'Auto-generated RFQ number', example: 'RFQ-2025-0001' })
  @Column({ name: 'rfq_number', unique: true })
  rfqNumber: string;

  @ApiProperty({ description: 'Project name', example: '500NB Pipeline Extension' })
  @Column({ name: 'project_name' })
  projectName: string;

  @ApiProperty({ description: 'Project description', required: false })
  @Column({ name: 'description', type: 'text', nullable: true })
  description?: string;

  @ApiProperty({ description: 'Customer company name', required: false })
  @Column({ name: 'customer_name', nullable: true })
  customerName?: string;

  @ApiProperty({ description: 'Customer email', required: false })
  @Column({ name: 'customer_email', nullable: true })
  customerEmail?: string;

  @ApiProperty({ description: 'Customer phone number', required: false })
  @Column({ name: 'customer_phone', nullable: true })
  customerPhone?: string;

  @ApiProperty({ description: 'Required delivery date', required: false })
  @Column({ name: 'required_date', type: 'date', nullable: true })
  requiredDate?: Date;

  @ApiProperty({ description: 'RFQ status', enum: RfqStatus })
  @Column({ name: 'status', type: 'enum', enum: RfqStatus, default: RfqStatus.DRAFT })
  status: RfqStatus;

  @ApiProperty({ description: 'Additional notes', required: false })
  @Column({ name: 'notes', type: 'text', nullable: true })
  notes?: string;

  @ApiProperty({ description: 'Total estimated weight in kg', required: false })
  @Column({ name: 'total_estimated_weight', type: 'decimal', precision: 10, scale: 2, nullable: true })
  totalWeightKg?: number;

  @ApiProperty({ description: 'Total estimated cost', required: false })
  @Column({ name: 'total_quoted_price', type: 'decimal', precision: 15, scale: 2, nullable: true })
  totalCost?: number;

  @ApiProperty({ description: 'User who created this RFQ', type: () => User, required: false })
  @ManyToOne(() => User, (user) => user.rfqs, { nullable: true })
  @JoinColumn({ name: 'created_by_user_id' })
  createdBy?: User;

  @ApiProperty({ description: 'RFQ items', type: () => [RfqItem] })
  @OneToMany(() => RfqItem, (item) => item.rfq, { cascade: true })
  items: RfqItem[];

  @ApiProperty({ description: 'Linked drawings', type: () => [Drawing] })
  @OneToMany(() => Drawing, (drawing) => drawing.rfq)
  drawings: Drawing[];

  @ApiProperty({ description: 'Linked BOQs', type: () => [Boq] })
  @OneToMany(() => Boq, (boq) => boq.rfq)
  boqs: Boq[];

  @ApiProperty({ description: 'Creation date' })
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update date' })
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
