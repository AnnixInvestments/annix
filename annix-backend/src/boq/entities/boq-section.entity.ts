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

/**
 * Stores pre-calculated consolidated BOQ sections for efficient supplier distribution.
 * Each section maps to a capability key that determines which suppliers can access it.
 */
@Entity('boq_sections')
@Index(['boqId'])
@Index(['capabilityKey'])
export class BoqSection {
  @ApiProperty({ description: 'Primary key', example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'Parent BOQ', type: () => Boq })
  @ManyToOne(() => Boq, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'boq_id' })
  boq: Boq;

  @Column({ name: 'boq_id' })
  boqId: number;

  @ApiProperty({
    description: 'Section type identifier',
    example: 'straight_pipes',
  })
  @Column({ name: 'section_type', length: 50 })
  sectionType: string; // 'straight_pipes', 'bends', 'fittings', 'flanges', 'bnw_sets', 'gaskets', etc.

  @ApiProperty({
    description: 'Capability key for supplier matching',
    example: 'fabricated_steel',
  })
  @Column({ name: 'capability_key', length: 50 })
  capabilityKey: string; // Maps to PRODUCTS_AND_SERVICES value

  @ApiProperty({
    description: 'Display title for this section',
    example: 'Straight Pipes',
  })
  @Column({ name: 'section_title', length: 100 })
  sectionTitle: string;

  @ApiProperty({
    description: 'Consolidated items for this section',
    type: 'array',
    items: { type: 'object', additionalProperties: true },
  })
  @Column({ type: 'jsonb', name: 'items' })
  items: any[]; // Array of consolidated items with description, qty, unit, weight, entries, welds, areas

  @ApiProperty({ description: 'Total weight in kg for this section' })
  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    name: 'total_weight_kg',
    nullable: true,
  })
  totalWeightKg?: number;

  @ApiProperty({ description: 'Number of items in this section' })
  @Column({ name: 'item_count', type: 'int', default: 0 })
  itemCount: number;

  @ApiProperty({ description: 'Creation date' })
  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ApiProperty({ description: 'Last update date' })
  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
