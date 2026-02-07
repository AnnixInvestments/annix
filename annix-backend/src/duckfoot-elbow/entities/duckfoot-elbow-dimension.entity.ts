import { Column, Entity, PrimaryGeneratedColumn, Unique } from "typeorm";

@Entity("duckfoot_elbow_dimensions")
@Unique(["nominalBoreMm"])
export class DuckfootElbowDimension {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "nominal_bore_mm", type: "int" })
  nominalBoreMm: number;

  @Column({
    name: "outside_diameter_mm",
    type: "decimal",
    precision: 8,
    scale: 2,
  })
  outsideDiameterMm: number;

  @Column({ name: "base_plate_x_mm", type: "decimal", precision: 8, scale: 2 })
  basePlateXMm: number;

  @Column({ name: "base_plate_y_mm", type: "decimal", precision: 8, scale: 2 })
  basePlateYMm: number;

  @Column({
    name: "rib_thickness_t2_mm",
    type: "decimal",
    precision: 5,
    scale: 2,
  })
  ribThicknessT2Mm: number;

  @Column({
    name: "plate_thickness_t1_mm",
    type: "decimal",
    precision: 5,
    scale: 2,
  })
  plateThicknessT1Mm: number;

  @Column({
    name: "rib_height_h_mm",
    type: "decimal",
    precision: 8,
    scale: 2,
  })
  ribHeightHMm: number;

  @Column({ type: "varchar", length: 255, nullable: true })
  notes: string | null;
}
