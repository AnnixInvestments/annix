import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { AnsiB169FittingType } from './ansi-b16-9-fitting-type.entity';

@Entity('ansi_b16_9_fitting_dimensions')
@Unique(['fittingTypeId', 'nps', 'schedule', 'branchNps'])
export class AnsiB169FittingDimension {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'fitting_type_id' })
  fittingTypeId: number;

  @ManyToOne(() => AnsiB169FittingType, (type) => type.dimensions)
  @JoinColumn({ name: 'fitting_type_id' })
  fittingType: AnsiB169FittingType;

  @Column({ type: 'varchar', length: 20 })
  nps: string;

  @Column({ name: 'nb_mm', type: 'decimal', precision: 10, scale: 2 })
  nbMm: number;

  @Column({ name: 'outside_diameter_mm', type: 'decimal', precision: 10, scale: 2 })
  outsideDiameterMm: number;

  @Column({ type: 'varchar', length: 20 })
  schedule: string;

  @Column({ name: 'wall_thickness_mm', type: 'decimal', precision: 8, scale: 2 })
  wallThicknessMm: number;

  @Column({ name: 'branch_nps', type: 'varchar', length: 20, nullable: true })
  branchNps: string | null;

  @Column({ name: 'branch_od_mm', type: 'decimal', precision: 10, scale: 2, nullable: true })
  branchOdMm: number | null;

  @Column({ name: 'center_to_face_a_mm', type: 'decimal', precision: 10, scale: 2, nullable: true })
  centerToFaceAMm: number | null;

  @Column({ name: 'center_to_face_b_mm', type: 'decimal', precision: 10, scale: 2, nullable: true })
  centerToFaceBMm: number | null;

  @Column({ name: 'center_to_center_o_mm', type: 'decimal', precision: 10, scale: 2, nullable: true })
  centerToCenterOMm: number | null;

  @Column({ name: 'back_to_face_k_mm', type: 'decimal', precision: 10, scale: 2, nullable: true })
  backToFaceKMm: number | null;

  @Column({ name: 'center_to_end_c_mm', type: 'decimal', precision: 10, scale: 2, nullable: true })
  centerToEndCMm: number | null;

  @Column({ name: 'center_to_end_m_mm', type: 'decimal', precision: 10, scale: 2, nullable: true })
  centerToEndMMm: number | null;

  @Column({ name: 'weight_kg', type: 'decimal', precision: 10, scale: 3, nullable: true })
  weightKg: number | null;
}
