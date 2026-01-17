import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('bracket_types')
export class BracketTypeEntity {
  @ApiProperty({ description: 'Primary key', example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'Bracket type code', example: 'CLEVIS_HANGER' })
  @Column({ name: 'type_code', type: 'varchar', length: 50, unique: true })
  typeCode: string;

  @ApiProperty({ description: 'Display name', example: 'Clevis Hanger' })
  @Column({ name: 'display_name', type: 'varchar', length: 100 })
  displayName: string;

  @ApiProperty({ description: 'Description of bracket use' })
  @Column({ name: 'description', type: 'text', nullable: true })
  description?: string;

  @ApiProperty({ description: 'Minimum NB size supported (mm)' })
  @Column({ name: 'min_nb_mm', type: 'int' })
  minNbMm: number;

  @ApiProperty({ description: 'Maximum NB size supported (mm)' })
  @Column({ name: 'max_nb_mm', type: 'int' })
  maxNbMm: number;

  @ApiProperty({ description: 'Weight factor per meter of support' })
  @Column({
    name: 'weight_factor',
    type: 'decimal',
    precision: 8,
    scale: 4,
    default: 1.0,
  })
  weightFactor: number;

  @ApiProperty({ description: 'Base material cost per unit (Rand)' })
  @Column({
    name: 'base_cost_per_unit',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  baseCostPerUnit?: number;

  @ApiProperty({ description: 'Suitable for insulated pipes' })
  @Column({ name: 'insulated_suitable', type: 'boolean', default: false })
  insulatedSuitable: boolean;

  @ApiProperty({ description: 'Allows thermal expansion' })
  @Column({ name: 'allows_expansion', type: 'boolean', default: false })
  allowsExpansion: boolean;

  @ApiProperty({ description: 'Fixed/anchor point type' })
  @Column({ name: 'is_anchor_type', type: 'boolean', default: false })
  isAnchorType: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
