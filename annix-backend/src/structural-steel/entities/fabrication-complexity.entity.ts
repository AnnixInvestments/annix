import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('fabrication_complexity_levels')
export class FabricationComplexity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  level: string; // 'simple', 'medium', 'complex'

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'hours_per_ton', type: 'decimal', precision: 8, scale: 2 })
  hoursPerTon: number;

  @Column({ name: 'labor_multiplier', type: 'decimal', precision: 4, scale: 2, default: 1.0 })
  laborMultiplier: number;

  @Column({ type: 'jsonb', nullable: true })
  examples: string[];

  @Column({ name: 'display_order', type: 'int', default: 0 })
  displayOrder: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
