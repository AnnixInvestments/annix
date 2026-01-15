import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { User } from '../../user/entities/user.entity';
import { NixExtraction } from './nix-extraction.entity';

export enum ClarificationStatus {
  PENDING = 'pending',
  ANSWERED = 'answered',
  SKIPPED = 'skipped',
  EXPIRED = 'expired',
}

export enum ClarificationType {
  MISSING_INFO = 'missing_info',
  AMBIGUOUS = 'ambiguous',
  CONFIRMATION = 'confirmation',
  RELEVANCE = 'relevance',
}

export enum ResponseType {
  TEXT = 'text',
  SCREENSHOT = 'screenshot',
  DOCUMENT_REFERENCE = 'document_reference',
  SELECTION = 'selection',
}

@Entity('nix_clarifications')
export class NixClarification {
  @ApiProperty({ description: 'Primary key' })
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => NixExtraction, { nullable: true })
  @JoinColumn({ name: 'extraction_id' })
  extraction?: NixExtraction;

  @Column({ name: 'extraction_id', nullable: true })
  extractionId?: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ name: 'user_id', nullable: true })
  userId?: number;

  @ApiProperty({ description: 'Type of clarification needed', enum: ClarificationType })
  @Column({
    name: 'clarification_type',
    type: 'enum',
    enum: ClarificationType,
  })
  clarificationType: ClarificationType;

  @ApiProperty({ description: 'Status of clarification', enum: ClarificationStatus })
  @Column({
    name: 'status',
    type: 'enum',
    enum: ClarificationStatus,
    default: ClarificationStatus.PENDING,
  })
  status: ClarificationStatus;

  @ApiProperty({ description: 'Question to display to user' })
  @Column({ name: 'question', type: 'text' })
  question: string;

  @ApiProperty({ description: 'Context about what needs clarification' })
  @Column({ name: 'context', type: 'jsonb', nullable: true })
  context?: {
    itemDescription?: string;
    pageNumber?: number;
    sectionName?: string;
    extractedValue?: string;
    suggestedOptions?: string[];
    rowNumber?: number;
    itemNumber?: string;
    itemType?: string;
    extractedMaterial?: string | null;
    extractedDiameter?: number | null;
    extractedLength?: number | null;
    extractedAngle?: number | null;
    extractedFlangeConfig?: string | null;
    extractedQuantity?: number;
    confidence?: number;
    clarificationReason?: string | null;
  };

  @ApiProperty({ description: 'Type of response received', enum: ResponseType })
  @Column({
    name: 'response_type',
    type: 'enum',
    enum: ResponseType,
    nullable: true,
  })
  responseType?: ResponseType;

  @ApiProperty({ description: 'User response text' })
  @Column({ name: 'response_text', type: 'text', nullable: true })
  responseText?: string;

  @ApiProperty({ description: 'Path to uploaded screenshot if applicable' })
  @Column({ name: 'response_screenshot_path', nullable: true })
  responseScreenshotPath?: string;

  @ApiProperty({ description: 'Document reference if applicable' })
  @Column({ name: 'response_document_ref', type: 'jsonb', nullable: true })
  responseDocumentRef?: {
    documentId?: number;
    pageNumber?: number;
    sectionName?: string;
  };

  @ApiProperty({ description: 'Whether this clarification was used for learning' })
  @Column({ name: 'used_for_learning', default: false })
  usedForLearning: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @Column({ name: 'answered_at', type: 'timestamp', nullable: true })
  answeredAt?: Date;
}
