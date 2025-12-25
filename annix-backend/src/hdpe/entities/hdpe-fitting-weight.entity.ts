import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { HdpeFittingType } from './hdpe-fitting-type.entity';

@Entity('hdpe_fitting_weights')
@Unique(['fittingTypeId', 'nominalBore'])
export class HdpeFittingWeight {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'fitting_type_id', type: 'int' })
  fittingTypeId: number;

  @ManyToOne(() => HdpeFittingType, (type) => type.weights, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'fitting_type_id' })
  fittingType: HdpeFittingType;

  @Column({ name: 'nominal_bore', type: 'int' })
  nominalBore: number; // DN in mm

  @Column({ name: 'weight_kg', type: 'decimal', precision: 10, scale: 3 })
  weightKg: number; // Weight per fitting in kg

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
