import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';

/**
 * PVC Pipe Specification Entity
 * Based on EN 1452 (ISO 1452-2) standards for PVC-U pressure pipes
 * DN = nominal outside diameter in mm for metric PVC-U
 * PN = Pressure Nominal rating in bar
 */
@Entity('pvc_pipe_specifications')
@Unique(['nominalDiameter', 'pressureRating', 'pvcType'])
export class PvcPipeSpecification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'nominal_diameter', type: 'int' })
  nominalDiameter: number; // DN in mm (12, 16, 20, 25, 32, ..., 1000)

  @Column({ name: 'outer_diameter', type: 'decimal', precision: 8, scale: 2 })
  outerDiameter: number; // OD in mm (for PVC-U, OD = DN)

  @Column({ name: 'pressure_rating', type: 'decimal', precision: 6, scale: 2 })
  pressureRating: number; // PN rating in bar (6, 8, 10, 12.5, 16, 20, 25)

  @Column({ name: 'wall_thickness', type: 'decimal', precision: 8, scale: 3 })
  wallThickness: number; // Minimum wall thickness in mm from EN 1452

  @Column({ name: 'inner_diameter', type: 'decimal', precision: 8, scale: 3 })
  innerDiameter: number; // OD - 2 * wall (mm)

  @Column({ name: 'weight_kg_per_m', type: 'decimal', precision: 10, scale: 4 })
  weightKgPerM: number; // Weight per meter (kg/m)

  @Column({ name: 'pvc_type', type: 'varchar', length: 20, default: 'PVC-U' })
  pvcType: string; // PVC-U, CPVC, PVC-O, PVC-M

  @Column({ name: 'standard', type: 'varchar', length: 50, default: 'EN_1452' })
  standard: string; // EN_1452, ISO_1452, ASTM_D1785, SABS_966

  @Column({ name: 'display_order', type: 'int', default: 0 })
  displayOrder: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
