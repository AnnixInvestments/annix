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

  @ApiProperty({ description: 'Dimension A (mm) - typically clevis width' })
  @Column({ name: 'dimension_a_mm', type: 'decimal', precision: 8, scale: 2, nullable: true })
  dimensionAMm: number | null;

  @ApiProperty({ description: 'Dimension B (mm) - typically clevis height' })
  @Column({ name: 'dimension_b_mm', type: 'decimal', precision: 8, scale: 2, nullable: true })
  dimensionBMm: number | null;

  @ApiProperty({ description: 'Rod diameter (mm)' })
  @Column({ name: 'rod_diameter_mm', type: 'decimal', precision: 8, scale: 2, nullable: true })
  rodDiameterMm: number | null;

  @ApiProperty({ description: 'Width (mm)' })
  @Column({ name: 'width_mm', type: 'decimal', precision: 8, scale: 2, nullable: true })
  widthMm: number | null;

  @ApiProperty({ description: 'Thickness (mm)' })
  @Column({ name: 'thickness_mm', type: 'decimal', precision: 8, scale: 2, nullable: true })
  thicknessMm: number | null;

  @ApiProperty({ description: 'Length (mm)' })
  @Column({ name: 'length_mm', type: 'decimal', precision: 8, scale: 2, nullable: true })
  lengthMm: number | null;

  @ApiProperty({ description: 'Brace length (mm)' })
  @Column({ name: 'brace_length_mm', type: 'decimal', precision: 8, scale: 2, nullable: true })
  braceLengthMm: number | null;

  @ApiProperty({ description: 'Base width (mm)' })
  @Column({ name: 'base_width_mm', type: 'decimal', precision: 8, scale: 2, nullable: true })
  baseWidthMm: number | null;

  @ApiProperty({ description: 'Base length (mm)' })
  @Column({ name: 'base_length_mm', type: 'decimal', precision: 8, scale: 2, nullable: true })
  baseLengthMm: number | null;

  @ApiProperty({ description: 'Height (mm)' })
  @Column({ name: 'height_mm', type: 'decimal', precision: 8, scale: 2, nullable: true })
  heightMm: number | null;

  @ApiProperty({ description: 'Typical weight per unit (kg)' })
  @Column({ name: 'weight_kg_per_unit', type: 'decimal', precision: 8, scale: 3, nullable: true })
  weightKgPerUnit: number | null;

  @ApiProperty({ description: 'Maximum load capacity (kg)' })
  @Column({ name: 'max_load_kg', type: 'decimal', precision: 10, scale: 2, nullable: true })
  maxLoadKg: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
