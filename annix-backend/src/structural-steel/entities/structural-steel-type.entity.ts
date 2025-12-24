import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn } from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';
import { StructuralSteelSection } from './structural-steel-section.entity';

@Entity('structural_steel_types')
export class StructuralSteelType {
  @ApiProperty({ description: 'Primary key', example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'Type name', example: 'Angle' })
  @Column({ type: 'varchar', length: 100, unique: true })
  name: string;

  @ApiProperty({ description: 'Type code for internal use', example: 'angle' })
  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @ApiProperty({ description: 'Description of the steel type' })
  @Column({ type: 'text', nullable: true })
  description: string;

  @ApiProperty({ description: 'Display order for sorting', example: 1 })
  @Column({ name: 'display_order', type: 'int', default: 0 })
  displayOrder: number;

  @ApiProperty({ description: 'Whether this type is active', default: true })
  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToMany(() => StructuralSteelSection, (section) => section.steelType)
  sections: StructuralSteelSection[];
}
