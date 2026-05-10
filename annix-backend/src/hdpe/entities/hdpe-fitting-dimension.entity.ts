import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from "typeorm";

// Discriminator for which catalogue row this is. Each type uses a
// different subset of the *_mm dim columns:
//   - elbow_90 / elbow_45         → faceToFaceMm + centreToFaceMm
//   - tee_equal                   → faceToFaceMm (run F-F) + centreToFaceMm (branch F-C)
//   - tee_reducing                → branchDnMm + faceToFaceMm + centreToFaceMm
//   - reducer                     → branchDnMm + lengthMm
//   - lateral_45                  → faceToFaceMm (run F-F) + branchLengthMm + centreToFaceMm
//   - end_cap                     → lengthMm
export type HdpeFittingDimensionType =
  | "elbow_90"
  | "elbow_45"
  | "tee_equal"
  | "tee_reducing"
  | "reducer"
  | "lateral_45"
  | "end_cap";

export type HdpeFittingDimensionSourceFlag = "catalogue" | "estimated";

@Entity("hdpe_fitting_dimensions")
@Unique(["fittingType", "mainDnMm", "branchDnMm"])
@Index("idx_hdpe_fitting_dim_lookup", ["fittingType", "mainDnMm"])
export class HdpeFittingDimension {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "fitting_type", type: "varchar", length: 20 })
  fittingType: HdpeFittingDimensionType;

  @Column({ name: "main_dn_mm", type: "int" })
  mainDnMm: number;

  // Null for symmetric fittings (elbows, equal tees, end caps);
  // populated for reducing tees and reducers (smaller end), and for
  // reducing laterals if/when those are added.
  @Column({ name: "branch_dn_mm", type: "int", nullable: true })
  branchDnMm: number | null;

  // Face-to-face (mm) — moulded elbow body length, equal-tee /
  // reducing-tee / lateral run face-to-face. Null when not applicable
  // to the fitting type (reducers, end caps).
  @Column({ name: "face_to_face_mm", type: "int", nullable: true })
  faceToFaceMm: number | null;

  // Centre-to-face (mm) — elbow C/F, tee branch face-to-centre,
  // lateral branch face-to-centre. Null when not applicable.
  @Column({ name: "centre_to_face_mm", type: "int", nullable: true })
  centreToFaceMm: number | null;

  // Branch length (mm) — lateral branch face-to-axis-midpoint along
  // the branch. Null for non-lateral fittings.
  @Column({ name: "branch_length_mm", type: "int", nullable: true })
  branchLengthMm: number | null;

  // Length (mm) — end-to-end for reducers, overall for end caps.
  // Null for elbows / tees / laterals (which use faceToFaceMm).
  @Column({ name: "length_mm", type: "int", nullable: true })
  lengthMm: number | null;

  @Column({ name: "source", type: "varchar", length: 12 })
  source: HdpeFittingDimensionSourceFlag;

  // Foreign key into the packages/product-data/hdpe/fitting-dimension-
  // sources.ts CatalogueSource registry. Stored as a string to avoid
  // a per-source DB table — the registry lives in code so adding a
  // new source is a TS change, not a migration.
  @Column({ name: "source_id", type: "varchar", length: 40 })
  sourceId: string;

  @Column({ name: "notes", type: "text", nullable: true })
  notes: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
