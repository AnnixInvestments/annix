import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

export enum LearningType {
  EXTRACTION_PATTERN = 'extraction_pattern',
  RELEVANCE_RULE = 'relevance_rule',
  TERMINOLOGY = 'terminology',
  CORRECTION = 'correction',
}

export enum LearningSource {
  ADMIN_SEEDED = 'admin_seeded',
  USER_CORRECTION = 'user_correction',
  AGGREGATED = 'aggregated',
  WEB_AUGMENTED = 'web_augmented',
}

@Entity('nix_learning')
export class NixLearning {
  @ApiProperty({ description: 'Primary key' })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'Type of learning data', enum: LearningType })
  @Column({
    name: 'learning_type',
    type: 'enum',
    enum: LearningType,
  })
  learningType: LearningType;

  @ApiProperty({ description: 'Source of learning data', enum: LearningSource })
  @Column({
    name: 'source',
    type: 'enum',
    enum: LearningSource,
    default: LearningSource.USER_CORRECTION,
  })
  source: LearningSource;

  @ApiProperty({ description: 'Category/domain this learning applies to' })
  @Column({ name: 'category', nullable: true })
  category?: string;

  @ApiProperty({ description: 'Pattern or rule identifier' })
  @Column({ name: 'pattern_key' })
  patternKey: string;

  @ApiProperty({ description: 'Original value before correction' })
  @Column({ name: 'original_value', type: 'text', nullable: true })
  originalValue?: string;

  @ApiProperty({ description: 'Corrected or learned value' })
  @Column({ name: 'learned_value', type: 'text' })
  learnedValue: string;

  @ApiProperty({ description: 'Additional context as JSON' })
  @Column({ name: 'context', type: 'jsonb', nullable: true })
  context?: Record<string, any>;

  @ApiProperty({ description: 'Confidence score from 0 to 1' })
  @Column({
    name: 'confidence',
    type: 'decimal',
    precision: 5,
    scale: 4,
    default: 0.5,
  })
  confidence: number;

  @ApiProperty({
    description: 'Number of times this pattern has been confirmed',
  })
  @Column({ name: 'confirmation_count', default: 1 })
  confirmationCount: number;

  @ApiProperty({ description: 'Product/service types this applies to' })
  @Column({
    name: 'applicable_products',
    type: 'text',
    array: true,
    nullable: true,
  })
  applicableProducts?: string[];

  @ApiProperty({ description: 'Whether this rule is active' })
  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
