import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('sabs62_fitting_dimension')
export class Sabs62FittingDimension {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'fitting_type', type: 'varchar', length: 50 })
  fittingType: string;

  @Column({ name: 'nominal_diameter_mm', type: 'decimal', precision: 10, scale: 2 })
  nominalDiameterMm: number;

  @Column({ name: 'outside_diameter_mm', type: 'decimal', precision: 10, scale: 2 })
  outsideDiameterMm: number;

  @Column({ name: 'nominal_diameter_b_mm', type: 'decimal', precision: 10, scale: 2, nullable: true })
  nominalDiameterBMm: number;

  @Column({ name: 'outside_diameter_b_mm', type: 'decimal', precision: 10, scale: 2, nullable: true })
  outsideDiameterBMm: number;

  @Column({ name: 'nominal_diameter_d_mm', type: 'decimal', precision: 10, scale: 2, nullable: true })
  nominalDiameterDMm: number;

  @Column({ name: 'outside_diameter_d_mm', type: 'decimal', precision: 10, scale: 2, nullable: true })
  outsideDiameterDMm: number;

  @Column({ name: 'angle_range', type: 'varchar', length: 20, nullable: true })
  angleRange: string;

  @Column({ name: 'dimension_a_mm', type: 'decimal', precision: 10, scale: 2, nullable: true })
  dimensionAMm: number;

  @Column({ name: 'dimension_b_mm', type: 'decimal', precision: 10, scale: 2, nullable: true })
  dimensionBMm: number;

  @Column({ name: 'centre_to_face_c_mm', type: 'decimal', precision: 10, scale: 2, nullable: true })
  centreToFaceCMm: number;

  @Column({ name: 'centre_to_face_d_mm', type: 'decimal', precision: 10, scale: 2, nullable: true })
  centreToFaceDMm: number;

  @Column({ name: 'radius_r_mm', type: 'decimal', precision: 10, scale: 2, nullable: true })
  radiusRMm: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
