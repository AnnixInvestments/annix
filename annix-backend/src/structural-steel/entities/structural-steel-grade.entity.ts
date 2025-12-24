import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('structural_steel_grades')
export class StructuralSteelGrade {
  @ApiProperty({ description: 'Primary key', example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'Grade code', example: 'A36' })
  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @ApiProperty({ description: 'Full name', example: 'ASTM A36' })
  @Column({ type: 'varchar', length: 100 })
  name: string;

  @ApiProperty({ description: 'Standard (ASTM, EN, etc.)', example: 'ASTM' })
  @Column({ type: 'varchar', length: 50 })
  standard: string;

  @ApiProperty({ description: 'Minimum yield strength in MPa', example: 250 })
  @Column({ name: 'yield_strength_mpa', type: 'decimal', precision: 8, scale: 2, nullable: true })
  yieldStrengthMpa: number;

  @ApiProperty({ description: 'Minimum tensile strength in MPa', example: 400 })
  @Column({ name: 'tensile_strength_mpa', type: 'decimal', precision: 8, scale: 2, nullable: true })
  tensileStrengthMpa: number;

  @ApiProperty({ description: 'Compatible steel types', example: ['angle', 'channel', 'beam'] })
  @Column({ name: 'compatible_types', type: 'jsonb', default: [] })
  compatibleTypes: string[];

  @ApiProperty({ description: 'Description of the grade' })
  @Column({ type: 'text', nullable: true })
  description: string;

  @ApiProperty({ description: 'Display order for sorting', example: 1 })
  @Column({ name: 'display_order', type: 'int', default: 0 })
  displayOrder: number;

  @ApiProperty({ description: 'Whether this grade is active', default: true })
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
