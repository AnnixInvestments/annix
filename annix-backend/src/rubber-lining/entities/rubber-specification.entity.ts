import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { RubberType } from './rubber-type.entity';

export enum RubberGrade {
  A = 'A',
  B = 'B',
  C = 'C',
  D = 'D',
}

export enum RubberClass {
  IRHD_40 = 40,
  IRHD_50 = 50,
  IRHD_60 = 60,
  IRHD_70 = 70,
}

@Entity('rubber_specifications')
export class RubberSpecification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'rubber_type_id', type: 'int' })
  rubberTypeId: number;

  @ManyToOne(() => RubberType, (type) => type.specifications)
  @JoinColumn({ name: 'rubber_type_id' })
  rubberType: RubberType;

  @Column({ name: 'grade', type: 'varchar', length: 10 })
  grade: string;

  @Column({ name: 'hardness_class_irhd', type: 'int' })
  hardnessClassIrhd: number;

  @Column({
    name: 'tensile_strength_mpa_min',
    type: 'decimal',
    precision: 5,
    scale: 1,
  })
  tensileStrengthMpaMin: number;

  @Column({
    name: 'elongation_at_break_min',
    type: 'int',
  })
  elongationAtBreakMin: number;

  @Column({
    name: 'tensile_after_ageing_min_percent',
    type: 'int',
  })
  tensileAfterAgeingMinPercent: number;

  @Column({
    name: 'tensile_after_ageing_max_percent',
    type: 'int',
  })
  tensileAfterAgeingMaxPercent: number;

  @Column({
    name: 'elongation_after_ageing_min_percent',
    type: 'int',
  })
  elongationAfterAgeingMinPercent: number;

  @Column({
    name: 'elongation_after_ageing_max_percent',
    type: 'int',
  })
  elongationAfterAgeingMaxPercent: number;

  @Column({
    name: 'hardness_change_after_ageing_max',
    type: 'int',
  })
  hardnessChangeAfterAgeingMax: number;

  @Column({
    name: 'heat_resistance_80c_hardness_change_max',
    type: 'int',
    nullable: true,
  })
  heatResistance80cHardnessChangeMax: number | null;

  @Column({
    name: 'heat_resistance_100c_hardness_change_max',
    type: 'int',
    nullable: true,
  })
  heatResistance100cHardnessChangeMax: number | null;

  @Column({
    name: 'ozone_resistance',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  ozoneResistance: string | null;

  @Column({
    name: 'chemical_resistance_hardness_change_max',
    type: 'int',
    nullable: true,
  })
  chemicalResistanceHardnessChangeMax: number | null;

  @Column({
    name: 'water_resistance_max_percent',
    type: 'int',
    nullable: true,
  })
  waterResistanceMaxPercent: number | null;

  @Column({
    name: 'oil_resistance_max_percent',
    type: 'int',
    nullable: true,
  })
  oilResistanceMaxPercent: number | null;

  @Column({
    name: 'contaminant_release_max_percent',
    type: 'int',
    nullable: true,
  })
  contaminantReleaseMaxPercent: number | null;

  @Column({ name: 'sans_standard', type: 'varchar', length: 50 })
  sansStandard: string;
}
