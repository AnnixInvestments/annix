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
import { User } from '../../user/entities/user.entity';
import { ApiProperty } from '@nestjs/swagger';

export enum WorkflowType {
  DRAWING_REVIEW = 'drawing_review',
  BOQ_REVIEW = 'boq_review',
  RFQ_REVIEW = 'rfq_review',
}

export enum ReviewEntityType {
  DRAWING = 'drawing',
  BOQ = 'boq',
  RFQ = 'rfq',
}

export enum ReviewStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  UNDER_REVIEW = 'under_review',
  CHANGES_REQUESTED = 'changes_requested',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

@Entity('review_workflows')
@Index(['entityType', 'entityId'])
@Index(['currentStatus'])
@Index(['isActive'])
export class ReviewWorkflow {
  @ApiProperty({ description: 'Primary key', example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'Type of workflow', enum: WorkflowType })
  @Column({ name: 'workflow_type', type: 'enum', enum: WorkflowType })
  workflowType: WorkflowType;

  @ApiProperty({ description: 'Entity type being reviewed', enum: ReviewEntityType })
  @Column({ name: 'entity_type', type: 'enum', enum: ReviewEntityType })
  entityType: ReviewEntityType;

  @ApiProperty({ description: 'ID of the entity being reviewed', example: 1 })
  @Column({ name: 'entity_id' })
  entityId: number;

  @ApiProperty({ description: 'Current review status', enum: ReviewStatus })
  @Column({ name: 'current_status', type: 'enum', enum: ReviewStatus, default: ReviewStatus.DRAFT })
  currentStatus: ReviewStatus;

  @ApiProperty({ description: 'Previous status', enum: ReviewStatus, required: false })
  @Column({ name: 'previous_status', type: 'enum', enum: ReviewStatus, nullable: true })
  previousStatus?: ReviewStatus;

  @ApiProperty({ description: 'User who submitted for review', type: () => User })
  @ManyToOne(() => User)
  @JoinColumn({ name: 'submitted_by_user_id' })
  submittedBy: User;

  @ApiProperty({ description: 'Assigned reviewer', type: () => User, required: false })
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'assigned_reviewer_user_id' })
  assignedReviewer?: User;

  @ApiProperty({ description: 'User who made the decision', type: () => User, required: false })
  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'decided_by_user_id' })
  decidedBy?: User;

  @ApiProperty({ description: 'Notes from the decision', required: false })
  @Column({ name: 'decision_notes', type: 'text', nullable: true })
  decisionNotes?: string;

  @ApiProperty({ description: 'When the item was submitted', required: false })
  @Column({ name: 'submitted_at', type: 'timestamp', nullable: true })
  submittedAt?: Date;

  @ApiProperty({ description: 'When the decision was made', required: false })
  @Column({ name: 'decided_at', type: 'timestamp', nullable: true })
  decidedAt?: Date;

  @ApiProperty({ description: 'Due date for review', required: false })
  @Column({ name: 'due_date', type: 'date', nullable: true })
  dueDate?: Date;

  @ApiProperty({ description: 'Whether this is the active workflow for the entity' })
  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @ApiProperty({ description: 'Creation date' })
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update date' })
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
