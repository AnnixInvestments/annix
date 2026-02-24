import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

export type GussetPlacementType = "HEEL_ONLY" | "SYMMETRICAL" | "FULL_COVERAGE";
export type GussetMaterialGrade = "Q235" | "A36" | "A283_C";
export type GussetWeldType = "FULL_PENETRATION" | "FILLET";

@Entity("gusset_configurations")
export class GussetConfiguration {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "dn_min", type: "int" })
  dnMin: number;

  @Column({ name: "dn_max", type: "int" })
  dnMax: number;

  @Column({ name: "pressure_class_min", type: "int", nullable: true })
  pressureClassMin: number | null;

  @Column({ name: "pressure_class_max", type: "int", nullable: true })
  pressureClassMax: number | null;

  @Column({ name: "gusset_count", type: "int" })
  gussetCount: number;

  @Column({ name: "thickness_mm", type: "decimal", precision: 5, scale: 1 })
  thicknessMm: number;

  @Column({
    name: "placement_type",
    type: "varchar",
    length: 20,
  })
  placementType: GussetPlacementType;

  @Column({ name: "heel_offset_mm", type: "decimal", precision: 6, scale: 1 })
  heelOffsetMm: number;

  @Column({
    name: "gusset_angle_degrees",
    type: "decimal",
    precision: 4,
    scale: 1,
    default: 45.0,
  })
  gussetAngleDegrees: number;

  @Column({
    name: "symmetry_spacing_degrees",
    type: "decimal",
    precision: 5,
    scale: 1,
    default: 90.0,
  })
  symmetrySpacingDegrees: number;

  @Column({
    name: "material_grade",
    type: "varchar",
    length: 10,
    default: "A36",
  })
  materialGrade: GussetMaterialGrade;

  @Column({
    name: "allowable_stress_mpa",
    type: "decimal",
    precision: 6,
    scale: 1,
    default: 250.0,
  })
  allowableStressMpa: number;

  @Column({
    name: "weld_type",
    type: "varchar",
    length: 20,
    default: "FILLET",
  })
  weldType: GussetWeldType;

  @Column({
    name: "weld_electrode",
    type: "varchar",
    length: 10,
    default: "E7018",
  })
  weldElectrode: string;

  @Column({
    name: "preheat_temp_c",
    type: "int",
    nullable: true,
  })
  preheatTempC: number | null;

  @Column({
    name: "pwht_required",
    type: "boolean",
    default: false,
  })
  pwhtRequired: boolean;

  @Column({ type: "varchar", length: 255, nullable: true })
  notes: string | null;
}
