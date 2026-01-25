import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';
import { ApiProperty } from '@nestjs/swagger';

@Entity('pipe_steel_work_config')
@Unique(['configKey'])
export class PipeSteelWorkConfigEntity {
  @ApiProperty({ description: 'Primary key', example: 1 })
  @PrimaryGeneratedColumn()
  id: number;

  @ApiProperty({
    description: 'Configuration key',
    example: 'STEEL_DENSITY_KG_M3',
  })
  @Column({ name: 'config_key', type: 'varchar', length: 100 })
  configKey: string;

  @ApiProperty({ description: 'Configuration value', example: '7850' })
  @Column({ name: 'config_value', type: 'varchar', length: 255 })
  configValue: string;

  @ApiProperty({ description: 'Value type', example: 'number' })
  @Column({
    name: 'value_type',
    type: 'varchar',
    length: 20,
    default: 'string',
  })
  valueType: 'string' | 'number' | 'boolean' | 'json';

  @ApiProperty({ description: 'Description' })
  @Column({ type: 'text', nullable: true })
  description: string | null;

  @ApiProperty({ description: 'Category', example: 'material' })
  @Column({ type: 'varchar', length: 50, nullable: true })
  category: string | null;

  @ApiProperty({ description: 'Unit of measure', example: 'kg/m³' })
  @Column({ type: 'varchar', length: 20, nullable: true })
  unit: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
