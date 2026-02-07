import { Column, Entity, PrimaryGeneratedColumn, Unique } from "typeorm";

@Entity("sabs_719_bend_dimensions")
@Unique(["bendRadiusType", "nominalBoreMm"])
export class Sabs719BendDimension {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "bend_radius_type", type: "varchar", length: 20 })
  bendRadiusType: string;

  @Column({ name: "nominal_bore_mm", type: "int" })
  nominalBoreMm: number;

  @Column({
    name: "outside_diameter_mm",
    type: "decimal",
    precision: 8,
    scale: 2,
  })
  outsideDiameterMm: number;

  @Column({
    name: "center_to_face_a_mm",
    type: "decimal",
    precision: 8,
    scale: 2,
  })
  centerToFaceAMm: number;

  @Column({
    name: "center_to_face_b_mm",
    type: "decimal",
    precision: 8,
    scale: 2,
  })
  centerToFaceBMm: number;

  @Column({
    name: "center_to_face_c_mm",
    type: "decimal",
    precision: 8,
    scale: 2,
  })
  centerToFaceCMm: number;

  @Column({ name: "radius_mm", type: "decimal", precision: 8, scale: 2 })
  radiusMm: number;
}
