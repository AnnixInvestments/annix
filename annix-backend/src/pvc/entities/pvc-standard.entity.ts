import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * PVC Standard Entity
 * Defines various PVC piping standards
 */
@Entity('pvc_standards')
export class PvcStandard {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'pvc_type', type: 'varchar', length: 20 })
  pvcType: string; // PVC-U, CPVC, PVC-O, PVC-M

  @Column({ type: 'varchar', length: 100, nullable: true })
  region: string; // EU, USA, South Africa, International

  @Column({ type: 'varchar', length: 200, nullable: true })
  application: string; // Potable water, Sewage, Industrial, etc.

  @Column({ name: 'display_order', type: 'int', default: 0 })
  displayOrder: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
