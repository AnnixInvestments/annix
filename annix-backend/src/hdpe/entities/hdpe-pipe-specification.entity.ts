import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';

@Entity('hdpe_pipe_specifications')
@Unique(['nominalBore', 'sdr'])
export class HdpePipeSpecification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'nominal_bore', type: 'int' })
  nominalBore: number; // DN in mm (20, 25, 32, ..., 1200)

  @Column({ name: 'outer_diameter', type: 'decimal', precision: 8, scale: 2 })
  outerDiameter: number; // OD in mm

  @Column({ type: 'decimal', precision: 6, scale: 2 })
  sdr: number; // Standard Dimension Ratio (6, 7.4, 9, 11, 13.6, 17, 21, 26, 32.5)

  @Column({ name: 'wall_thickness', type: 'decimal', precision: 8, scale: 3 })
  wallThickness: number; // Calculated: OD / SDR (mm)

  @Column({ name: 'inner_diameter', type: 'decimal', precision: 8, scale: 3 })
  innerDiameter: number; // OD - 2 * wall (mm)

  @Column({ name: 'weight_kg_per_m', type: 'decimal', precision: 10, scale: 4 })
  weightKgPerM: number; // Weight per meter (kg/m)

  @Column({ name: 'pressure_rating_pn', type: 'decimal', precision: 6, scale: 2, nullable: true })
  pressureRatingPn: number; // PN rating in bar (for PE100: ~20/(SDR-1))

  @Column({ name: 'material_grade', type: 'varchar', length: 20, default: 'PE100' })
  materialGrade: string; // PE100, PE80

  @Column({ name: 'display_order', type: 'int', default: 0 })
  displayOrder: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
