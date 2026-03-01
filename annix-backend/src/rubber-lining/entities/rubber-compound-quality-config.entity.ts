import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("rubber_compound_quality_configs")
export class RubberCompoundQualityConfig {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: "compound_code",
    type: "varchar",
    length: 100,
    unique: true,
  })
  compoundCode: string;

  @Column({ name: "window_size", type: "int", default: 10 })
  windowSize: number;

  @Column({
    name: "shore_a_drift_threshold",
    type: "decimal",
    precision: 5,
    scale: 2,
    nullable: true,
  })
  shoreADriftThreshold: number | null;

  @Column({
    name: "specific_gravity_drift_threshold",
    type: "decimal",
    precision: 5,
    scale: 3,
    nullable: true,
  })
  specificGravityDriftThreshold: number | null;

  @Column({
    name: "rebound_drift_threshold",
    type: "decimal",
    precision: 5,
    scale: 2,
    nullable: true,
  })
  reboundDriftThreshold: number | null;

  @Column({
    name: "tear_strength_drop_percent",
    type: "decimal",
    precision: 5,
    scale: 2,
    nullable: true,
  })
  tearStrengthDropPercent: number | null;

  @Column({
    name: "tensile_strength_drop_percent",
    type: "decimal",
    precision: 5,
    scale: 2,
    nullable: true,
  })
  tensileStrengthDropPercent: number | null;

  @Column({
    name: "elongation_drop_percent",
    type: "decimal",
    precision: 5,
    scale: 2,
    nullable: true,
  })
  elongationDropPercent: number | null;

  @Column({
    name: "tc90_cv_threshold",
    type: "decimal",
    precision: 5,
    scale: 2,
    nullable: true,
  })
  tc90CvThreshold: number | null;

  @Column({
    name: "shore_a_nominal",
    type: "decimal",
    precision: 5,
    scale: 1,
    nullable: true,
  })
  shoreANominal: number | null;

  @Column({
    name: "shore_a_min",
    type: "decimal",
    precision: 5,
    scale: 1,
    nullable: true,
  })
  shoreAMin: number | null;

  @Column({
    name: "shore_a_max",
    type: "decimal",
    precision: 5,
    scale: 1,
    nullable: true,
  })
  shoreAMax: number | null;

  @Column({
    name: "density_nominal",
    type: "decimal",
    precision: 5,
    scale: 3,
    nullable: true,
  })
  densityNominal: number | null;

  @Column({
    name: "density_min",
    type: "decimal",
    precision: 5,
    scale: 3,
    nullable: true,
  })
  densityMin: number | null;

  @Column({
    name: "density_max",
    type: "decimal",
    precision: 5,
    scale: 3,
    nullable: true,
  })
  densityMax: number | null;

  @Column({
    name: "rebound_nominal",
    type: "decimal",
    precision: 5,
    scale: 2,
    nullable: true,
  })
  reboundNominal: number | null;

  @Column({
    name: "rebound_min",
    type: "decimal",
    precision: 5,
    scale: 2,
    nullable: true,
  })
  reboundMin: number | null;

  @Column({
    name: "rebound_max",
    type: "decimal",
    precision: 5,
    scale: 2,
    nullable: true,
  })
  reboundMax: number | null;

  @Column({
    name: "tear_strength_nominal",
    type: "decimal",
    precision: 6,
    scale: 1,
    nullable: true,
  })
  tearStrengthNominal: number | null;

  @Column({
    name: "tear_strength_min",
    type: "decimal",
    precision: 6,
    scale: 1,
    nullable: true,
  })
  tearStrengthMin: number | null;

  @Column({
    name: "tear_strength_max",
    type: "decimal",
    precision: 6,
    scale: 1,
    nullable: true,
  })
  tearStrengthMax: number | null;

  @Column({
    name: "tensile_nominal",
    type: "decimal",
    precision: 6,
    scale: 2,
    nullable: true,
  })
  tensileNominal: number | null;

  @Column({
    name: "tensile_min",
    type: "decimal",
    precision: 6,
    scale: 2,
    nullable: true,
  })
  tensileMin: number | null;

  @Column({
    name: "tensile_max",
    type: "decimal",
    precision: 6,
    scale: 2,
    nullable: true,
  })
  tensileMax: number | null;

  @Column({
    name: "elongation_nominal",
    type: "decimal",
    precision: 6,
    scale: 1,
    nullable: true,
  })
  elongationNominal: number | null;

  @Column({
    name: "elongation_min",
    type: "decimal",
    precision: 6,
    scale: 1,
    nullable: true,
  })
  elongationMin: number | null;

  @Column({
    name: "elongation_max",
    type: "decimal",
    precision: 6,
    scale: 1,
    nullable: true,
  })
  elongationMax: number | null;

  @Column({ name: "compound_description", type: "varchar", length: 255, nullable: true })
  compoundDescription: string | null;

  @Column({ name: "updated_by", type: "varchar", length: 100, nullable: true })
  updatedBy: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
