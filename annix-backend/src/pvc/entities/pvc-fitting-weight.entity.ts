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
import { PvcFittingType } from './pvc-fitting-type.entity';

/**
 * PVC Fitting Weight Entity
 * Weight data for PVC fittings by nominal diameter and pressure rating
 */
@Entity('pvc_fitting_weights')
@Unique(['fittingTypeId', 'nominalDiameter', 'pressureRating'])
export class PvcFittingWeight {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'fitting_type_id', type: 'int' })
  fittingTypeId: number;

  @ManyToOne(() => PvcFittingType, (type) => type.weights, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'fitting_type_id' })
  fittingType: PvcFittingType;

  @Column({ name: 'nominal_diameter', type: 'int' })
  nominalDiameter: number; // DN in mm

  @Column({ name: 'pressure_rating', type: 'decimal', precision: 6, scale: 2, default: 10 })
  pressureRating: number; // PN rating (some fittings may vary by pressure class)

  @Column({ name: 'weight_kg', type: 'decimal', precision: 10, scale: 4 })
  weightKg: number; // Weight per fitting in kg

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
