import { Column, Entity, PrimaryGeneratedColumn, Unique } from "typeorm";

@Entity("malleable_iron_fitting_dimensions")
@Unique(["fittingType", "nominalBoreMm", "pressureClass"])
export class MalleableIronFittingDimension {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "fitting_type", type: "varchar", length: 50 })
  fittingType: string;

  @Column({ name: "nominal_bore_mm", type: "decimal", precision: 10, scale: 2 })
  nominalBoreMm: number;

  @Column({ name: "pressure_class", type: "int" })
  pressureClass: number;

  @Column({ name: "center_to_face_mm", type: "decimal", precision: 10, scale: 2, nullable: true })
  centerToFaceMm: number | null;

  @Column({ name: "thread_length_mm", type: "decimal", precision: 10, scale: 2, nullable: true })
  threadLengthMm: number | null;

  @Column({ name: "weight_kg", type: "decimal", precision: 10, scale: 3, nullable: true })
  weightKg: number | null;

  @Column({ type: "varchar", length: 50, default: "'BS 143'" })
  standard: string;
}
