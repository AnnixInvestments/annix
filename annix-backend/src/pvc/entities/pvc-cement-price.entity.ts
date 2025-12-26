import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';

/**
 * PVC Cement Price Entity
 * Solvent cement costs for PVC joints based on pipe size
 */
@Entity('pvc_cement_prices')
@Unique(['nominalDiameter'])
export class PvcCementPrice {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'nominal_diameter', type: 'int' })
  nominalDiameter: number; // DN in mm

  @Column({ name: 'price_per_joint', type: 'decimal', precision: 10, scale: 2 })
  pricePerJoint: number; // Cost per solvent cement joint

  @Column({ name: 'cement_volume_ml', type: 'decimal', precision: 8, scale: 2, nullable: true })
  cementVolumeMl: number; // Approximate cement volume per joint in ml

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
