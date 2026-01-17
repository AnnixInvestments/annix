import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('pipe_support_spacing')
export class PipeSupportSpacing {
  @ApiProperty({ description: 'Primary key', example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({ description: 'Nominal bore in mm', example: 50 })
  @Column({ name: 'nb_mm', type: 'int' })
  nbMm: number;

  @ApiProperty({ description: 'Nominal pipe size in inches', example: '2"' })
  @Column({ name: 'nps', type: 'varchar', length: 10 })
  nps: string;

  @ApiProperty({ description: 'Standard pipe schedule', example: 'Std' })
  @Column({ name: 'schedule', type: 'varchar', length: 20 })
  schedule: string;

  @ApiProperty({ description: 'Maximum span for water-filled pipe (m)' })
  @Column({
    name: 'water_filled_span_m',
    type: 'decimal',
    precision: 5,
    scale: 2,
  })
  waterFilledSpanM: number;

  @ApiProperty({ description: 'Maximum span for vapor/gas pipe (m)' })
  @Column({
    name: 'vapor_gas_span_m',
    type: 'decimal',
    precision: 5,
    scale: 2,
  })
  vaporGasSpanM: number;

  @ApiProperty({ description: 'Rod size for hanger (mm)' })
  @Column({
    name: 'rod_size_mm',
    type: 'int',
    nullable: true,
  })
  rodSizeMm?: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
