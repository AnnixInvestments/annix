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

export class HdpeFittingDimension {
  id: number;

  fittingType: HdpeFittingDimensionType;

  mainDnMm: number;

  // Null for symmetric fittings (elbows, equal tees, end caps);
  // populated for reducing tees and reducers (smaller end), and for
  // reducing laterals if/when those are added.
  branchDnMm: number | null;

  // Face-to-face (mm) — moulded elbow body length, equal-tee /
  // reducing-tee / lateral run face-to-face. Null when not applicable
  // to the fitting type (reducers, end caps).
  faceToFaceMm: number | null;

  // Centre-to-face (mm) — elbow C/F, tee branch face-to-centre,
  // lateral branch face-to-centre. Null when not applicable.
  centreToFaceMm: number | null;

  // Branch length (mm) — lateral branch face-to-axis-midpoint along
  // the branch. Null for non-lateral fittings.
  branchLengthMm: number | null;

  // Length (mm) — end-to-end for reducers, overall for end caps.
  // Null for elbows / tees / laterals (which use faceToFaceMm).
  lengthMm: number | null;

  source: HdpeFittingDimensionSourceFlag;

  // Foreign key into the packages/product-data/hdpe/fitting-dimension-
  // sources.ts CatalogueSource registry. Stored as a string to avoid
  // a per-source DB table — the registry lives in code so adding a
  // new source is a TS change, not a migration.
  sourceId: string;

  notes: string | null;

  createdAt: Date;

  updatedAt: Date;
}
