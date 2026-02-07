import { Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

@Entity("sweep_tee_dimensions")
@Index(["nominalBoreMm", "radiusType"], { unique: true })
export class SweepTeeDimension {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: "integer",
    comment: "Nominal bore in millimeters (200, 250, 300, etc.)",
  })
  nominalBoreMm: number;

  @Column({
    type: "decimal",
    precision: 6,
    scale: 1,
    comment: "Outside diameter in millimeters",
  })
  outsideDiameterMm: number;

  @Column({
    type: "varchar",
    length: 20,
    comment: "Radius type: long_radius, medium_radius, or elbow",
  })
  radiusType: string;

  @Column({
    type: "integer",
    comment: "Bend radius dimension (A for long, C for medium, R for elbow) in mm",
  })
  bendRadiusMm: number;

  @Column({
    type: "integer",
    comment: "Pipe A length dimension (B for long, D for medium, F for elbow) in mm",
  })
  pipeALengthMm: number;

  @Column({
    type: "integer",
    nullable: true,
    comment: "E dimension for elbows only, in mm",
  })
  elbowEMm: number | null;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  createdAt: Date;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  updatedAt: Date;
}
