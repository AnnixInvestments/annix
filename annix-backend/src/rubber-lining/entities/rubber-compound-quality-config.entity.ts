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

  @Column({ name: "updated_by", type: "varchar", length: 100, nullable: true })
  updatedBy: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
