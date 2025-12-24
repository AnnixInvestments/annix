import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('fabrication_operations')
export class FabricationOperation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 20 })
  unit: string; // 'hole', 'meter', 'each', 'kg', 'mm'

  @Column({ name: 'hours_per_unit', type: 'decimal', precision: 8, scale: 4 })
  hoursPerUnit: number;

  @Column({ name: 'cost_per_unit', type: 'decimal', precision: 10, scale: 2, nullable: true })
  costPerUnit: number;

  @Column({ name: 'stainless_multiplier', type: 'decimal', precision: 4, scale: 2, default: 1.5 })
  stainlessMultiplier: number;

  @Column({ name: 'display_order', type: 'int', default: 0 })
  displayOrder: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
