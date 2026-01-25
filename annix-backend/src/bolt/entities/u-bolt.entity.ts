import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Unique,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('u_bolts')
@Unique(['nps', 'threadSize'])
export class UBoltEntity {
  @ApiProperty({ description: 'Primary key', example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'NPS designation', example: '4"' })
  @Column({ type: 'varchar', length: 10 })
  nps: string;

  @ApiProperty({ description: 'Nominal bore (mm)', example: 100 })
  @Column({ name: 'nb_mm', type: 'int' })
  nbMm: number;

  @ApiProperty({ description: 'Pipe OD range min (mm)', example: 114.3 })
  @Column({ name: 'pipe_od_min_mm', type: 'decimal', precision: 8, scale: 2 })
  pipeOdMinMm: number;

  @ApiProperty({ description: 'Pipe OD range max (mm)', example: 114.3 })
  @Column({ name: 'pipe_od_max_mm', type: 'decimal', precision: 8, scale: 2 })
  pipeOdMaxMm: number;

  @ApiProperty({ description: 'Thread size designation', example: 'M12' })
  @Column({ name: 'thread_size', type: 'varchar', length: 20 })
  threadSize: string;

  @ApiProperty({ description: 'Thread diameter (mm)', example: 12 })
  @Column({
    name: 'thread_diameter_mm',
    type: 'decimal',
    precision: 6,
    scale: 2,
  })
  threadDiameterMm: number;

  @ApiProperty({ description: 'Inside width at crown (mm)', example: 127 })
  @Column({ name: 'inside_width_mm', type: 'decimal', precision: 8, scale: 2 })
  insideWidthMm: number;

  @ApiProperty({ description: 'Leg length (mm)', example: 125 })
  @Column({ name: 'leg_length_mm', type: 'decimal', precision: 8, scale: 2 })
  legLengthMm: number;

  @ApiProperty({ description: 'Thread length per leg (mm)', example: 40 })
  @Column({ name: 'thread_length_mm', type: 'decimal', precision: 8, scale: 2 })
  threadLengthMm: number;

  @ApiProperty({ description: 'Rod diameter (mm)', example: 12 })
  @Column({ name: 'rod_diameter_mm', type: 'decimal', precision: 6, scale: 2 })
  rodDiameterMm: number;

  @ApiProperty({ description: 'Unit weight (kg)', example: 0.35 })
  @Column({ name: 'unit_weight_kg', type: 'decimal', precision: 8, scale: 3 })
  unitWeightKg: number;

  @ApiProperty({
    description: 'Standard (e.g., DIN 3570)',
    example: 'DIN 3570',
  })
  @Column({ type: 'varchar', length: 50, nullable: true })
  standard: string | null;

  @ApiProperty({ description: 'Material grade', example: '4.6' })
  @Column({
    name: 'material_grade',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  materialGrade: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
