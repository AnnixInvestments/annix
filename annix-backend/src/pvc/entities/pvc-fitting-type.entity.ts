import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { PvcFittingWeight } from './pvc-fitting-weight.entity';

/**
 * PVC Fitting Type Entity
 * Defines various PVC fitting types (elbows, tees, couplings, etc.)
 */
@Entity('pvc_fitting_types')
export class PvcFittingType {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'num_joints', type: 'int', default: 0 })
  numJoints: number; // Number of solvent cement joints or socket joints

  @Column({ name: 'is_socket', type: 'boolean', default: true })
  isSocket: boolean; // Socket (solvent cement) vs other joining methods

  @Column({ name: 'is_flanged', type: 'boolean', default: false })
  isFlanged: boolean; // Flanged connection

  @Column({ name: 'is_threaded', type: 'boolean', default: false })
  isThreaded: boolean; // Threaded connection

  @Column({ type: 'varchar', length: 50, nullable: true })
  category: string; // elbow, tee, coupling, reducer, cap, union, valve, etc.

  @Column({ name: 'angle_degrees', type: 'int', nullable: true })
  angleDegrees: number; // For elbows: 45, 90, etc.

  @Column({ name: 'display_order', type: 'int', default: 0 })
  displayOrder: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @OneToMany(() => PvcFittingWeight, (weight) => weight.fittingType)
  weights: PvcFittingWeight[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
