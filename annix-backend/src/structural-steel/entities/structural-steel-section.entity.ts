import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { StructuralSteelType } from './structural-steel-type.entity';

@Entity('structural_steel_sections')
export class StructuralSteelSection {
  @ApiProperty({ description: 'Primary key', example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'Steel type ID' })
  @Column({ name: 'type_id', type: 'int' })
  typeId: number;

  @ManyToOne(() => StructuralSteelType, (type) => type.sections, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'type_id' })
  steelType: StructuralSteelType;

  @ApiProperty({ description: 'Section designation', example: '50x50x5' })
  @Column({ type: 'varchar', length: 100 })
  designation: string;

  @ApiProperty({ description: 'Dimensions as JSON', example: { leg1: 50, leg2: 50, thickness: 5 } })
  @Column({ type: 'jsonb' })
  dimensions: Record<string, number>;

  @ApiProperty({ description: 'Weight per meter in kg/m', example: 3.77 })
  @Column({ name: 'weight_kg_per_m', type: 'decimal', precision: 10, scale: 4 })
  weightKgPerM: number;

  @ApiProperty({ description: 'Surface area per meter in m²/m', example: 0.193 })
  @Column({ name: 'surface_area_m2_per_m', type: 'decimal', precision: 10, scale: 6 })
  surfaceAreaM2PerM: number;

  @ApiProperty({ description: 'Available grades for this section', example: ['A36', 'A572-50'] })
  @Column({ type: 'jsonb', default: [] })
  grades: string[];

  @ApiProperty({ description: 'Section area in mm²', nullable: true })
  @Column({ name: 'section_area_mm2', type: 'decimal', precision: 12, scale: 2, nullable: true })
  sectionAreaMm2: number;

  @ApiProperty({ description: 'Moment of inertia Ix in cm⁴', nullable: true })
  @Column({ name: 'moment_of_inertia_ix_cm4', type: 'decimal', precision: 12, scale: 2, nullable: true })
  momentOfInertiaIxCm4: number;

  @ApiProperty({ description: 'Moment of inertia Iy in cm⁴', nullable: true })
  @Column({ name: 'moment_of_inertia_iy_cm4', type: 'decimal', precision: 12, scale: 2, nullable: true })
  momentOfInertiaIyCm4: number;

  @ApiProperty({ description: 'Section modulus Zx in cm³', nullable: true })
  @Column({ name: 'section_modulus_zx_cm3', type: 'decimal', precision: 12, scale: 2, nullable: true })
  sectionModulusZxCm3: number;

  @ApiProperty({ description: 'Section modulus Zy in cm³', nullable: true })
  @Column({ name: 'section_modulus_zy_cm3', type: 'decimal', precision: 12, scale: 2, nullable: true })
  sectionModulusZyCm3: number;

  @ApiProperty({ description: 'Display order for sorting', example: 1 })
  @Column({ name: 'display_order', type: 'int', default: 0 })
  displayOrder: number;

  @ApiProperty({ description: 'Whether this section is active', default: true })
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
