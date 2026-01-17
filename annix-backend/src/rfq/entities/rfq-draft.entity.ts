import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';
import { Rfq } from './rfq.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity('rfq_drafts')
export class RfqDraft {
  @ApiProperty({ description: 'Primary key', example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({
    description: 'Auto-generated draft number',
    example: 'DRAFT-2025-0001',
  })
  @Column({ name: 'draft_number', unique: true })
  draftNumber: string;

  @ApiProperty({
    description: 'Customer RFQ reference number (user-inputted)',
    example: 'RFQ-2025-001',
  })
  @Column({ name: 'customer_rfq_reference', nullable: true })
  customerRfqReference?: string;

  @ApiProperty({
    description: 'Project name (for display purposes)',
    example: '500NB Pipeline Extension',
  })
  @Column({ name: 'project_name', nullable: true })
  projectName?: string;

  @ApiProperty({
    description: 'Current step in the RFQ form (1-5)',
    example: 2,
  })
  @Column({ name: 'current_step', type: 'int', default: 1 })
  currentStep: number;

  @ApiProperty({
    description: 'Complete form state as JSON',
  })
  @Column({ name: 'form_data', type: 'jsonb' })
  formData: Record<string, any>;

  @ApiProperty({
    description: 'Global specifications as JSON',
  })
  @Column({ name: 'global_specs', type: 'jsonb', nullable: true })
  globalSpecs?: Record<string, any>;

  @ApiProperty({
    description: 'Required products/services selected',
  })
  @Column({ name: 'required_products', type: 'jsonb', nullable: true })
  requiredProducts?: string[];

  @ApiProperty({
    description: 'Straight pipe entries as JSON',
  })
  @Column({ name: 'straight_pipe_entries', type: 'jsonb', nullable: true })
  straightPipeEntries?: Record<string, any>[];

  @ApiProperty({
    description: 'Pending documents metadata',
  })
  @Column({ name: 'pending_documents', type: 'jsonb', nullable: true })
  pendingDocuments?: Record<string, any>[];

  @ApiProperty({
    description: 'Completion percentage (0-100)',
    example: 45,
  })
  @Column({ name: 'completion_percentage', type: 'int', default: 0 })
  completionPercentage: number;

  @ApiProperty({
    description: 'User who created this draft',
    type: () => User,
  })
  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'created_by_user_id' })
  createdBy: User;

  @ApiProperty({
    description: 'ID of the converted RFQ (if submitted)',
    required: false,
  })
  @Column({ name: 'converted_rfq_id', nullable: true })
  convertedRfqId?: number;

  @ManyToOne(() => Rfq, { nullable: true })
  @JoinColumn({ name: 'converted_rfq_id' })
  convertedRfq?: Rfq;

  @ApiProperty({ description: 'Whether this draft was converted to an RFQ' })
  @Column({ name: 'is_converted', default: false })
  isConverted: boolean;

  @ApiProperty({ description: 'Creation date' })
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update date' })
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
