import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('sabs719_fitting_dimension')
export class Sabs719FittingDimension {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'fitting_type', type: 'varchar', length: 50 })
  fittingType: string;

  @Column({ name: 'nominal_diameter_mm', type: 'decimal', precision: 10, scale: 2 })
  nominalDiameterMm: number;

  @Column({ name: 'outside_diameter_mm', type: 'decimal', precision: 10, scale: 2 })
  outsideDiameterMm: number;

  @Column({ name: 'dimension_a_mm', type: 'decimal', precision: 10, scale: 2, nullable: true })
  dimensionAMm: number;

  @Column({ name: 'dimension_b_mm', type: 'decimal', precision: 10, scale: 2, nullable: true })
  dimensionBMm: number;

  @Column({ name: 'dimension_c_mm', type: 'decimal', precision: 10, scale: 2, nullable: true })
  dimensionCMm: number;

  @Column({ name: 'dimension_d_mm', type: 'decimal', precision: 10, scale: 2, nullable: true })
  dimensionDMm: number;

  @Column({ name: 'dimension_e_mm', type: 'decimal', precision: 10, scale: 2, nullable: true })
  dimensionEMm: number;

  @Column({ name: 'dimension_f_mm', type: 'decimal', precision: 10, scale: 2, nullable: true })
  dimensionFMm: number;

  @Column({ name: 'dimension_x_mm', type: 'decimal', precision: 10, scale: 2, nullable: true })
  dimensionXMm: number;

  @Column({ name: 'dimension_y_mm', type: 'decimal', precision: 10, scale: 2, nullable: true })
  dimensionYMm: number;

  @Column({ name: 'thickness_t1_mm', type: 'decimal', precision: 10, scale: 2, nullable: true })
  thicknessT1Mm: number;

  @Column({ name: 'thickness_t2_mm', type: 'decimal', precision: 10, scale: 2, nullable: true })
  thicknessT2Mm: number;

  @Column({ name: 'dimension_h_mm', type: 'decimal', precision: 10, scale: 2, nullable: true })
  dimensionHMm: number;

  @Column({ name: 'radius_r_mm', type: 'decimal', precision: 10, scale: 2, nullable: true })
  radiusRMm: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
