import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { ForgedFittingSeries } from './forged-fitting-series.entity';
import { ForgedFittingType } from './forged-fitting-type.entity';

@Entity('forged_fitting_dimensions')
@Unique(['seriesId', 'fittingTypeId', 'nominalBoreMm'])
export class ForgedFittingDimension {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'series_id' })
  seriesId: number;

  @ManyToOne(() => ForgedFittingSeries, (series) => series.dimensions)
  @JoinColumn({ name: 'series_id' })
  series: ForgedFittingSeries;

  @Column({ name: 'fitting_type_id' })
  fittingTypeId: number;

  @ManyToOne(() => ForgedFittingType, (type) => type.dimensions)
  @JoinColumn({ name: 'fitting_type_id' })
  fittingType: ForgedFittingType;

  @Column({ name: 'nominal_bore_mm', type: 'decimal', precision: 10, scale: 2 })
  nominalBoreMm: number;

  @Column({
    name: 'dimension_a_mm',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  dimensionAMm: number | null;

  @Column({
    name: 'dimension_b_mm',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  dimensionBMm: number | null;

  @Column({
    name: 'dimension_c_mm',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  dimensionCMm: number | null;

  @Column({
    name: 'dimension_d_mm',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  dimensionDMm: number | null;

  @Column({
    name: 'dimension_e_mm',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  dimensionEMm: number | null;

  @Column({
    name: 'mass_kg',
    type: 'decimal',
    precision: 10,
    scale: 3,
    nullable: true,
  })
  massKg: number | null;
}
