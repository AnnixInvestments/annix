// Discriminator for which catalogue row this is. Mirrors the HDPE
// pattern (`HdpeFittingDimensionType`) but with the wider angle set
// SANS 1601 injection-moulded PVC fittings ship in. Each type uses
// a different subset of the *_mm dim columns:
//   - elbow_11_25 / elbow_22_5 / elbow_45 / elbow_90 → centreToFaceMm
//   - tee_equal                                       → faceToFaceMm (run F-F) + centreToFaceMm (branch F-C)
//   - tee_reducing                                    → branchDnMm + faceToFaceMm + centreToFaceMm
//   - reducer                                         → branchDnMm + lengthMm
//   - end_cap                                         → lengthMm
//   - coupling_slip / coupling_rrj / coupling_compression → lengthMm
//   - saddle                                          → branchDnMm + lengthMm
//   - flange_adapter                                  → lengthMm + faceToFaceMm
export type PvcFittingDimensionType =
  | "elbow_11_25"
  | "elbow_22_5"
  | "elbow_45"
  | "elbow_90"
  | "tee_equal"
  | "tee_reducing"
  | "reducer"
  | "end_cap"
  | "coupling_slip"
  | "coupling_rrj"
  | "coupling_compression"
  | "saddle"
  | "flange_adapter";

export type PvcFittingDimensionSourceFlag = "catalogue" | "estimated";

export class PvcFittingDimension {
  id: number;

  fittingType: PvcFittingDimensionType;

  mainDnMm: number;

  // Null for symmetric fittings (elbows, equal tees, end caps,
  // couplings, flange adapters); populated for reducing tees,
  // reducers, and saddles (branch DN).
  branchDnMm: number | null;

  // Face-to-face (mm) — equal-tee / reducing-tee run face-to-face,
  // flange-adapter spigot-to-flange. Null for elbows / reducers /
  // end caps / couplings / saddles (which use lengthMm or
  // centreToFaceMm).
  faceToFaceMm: number | null;

  // Centre-to-face (mm) — elbow C/F (the Z dimension on PVC
  // datasheets), tee branch face-to-centre. Null for reducers /
  // end caps / couplings.
  centreToFaceMm: number | null;

  // Branch length (mm) — placeholder slot for future reducing-
  // lateral / branched-saddle entries. Null for everything
  // currently seeded.
  branchLengthMm: number | null;

  // Length (mm) — end-to-end for reducers / end caps / couplings /
  // saddles / flange adapters. Null for elbows and tees (which use
  // centreToFaceMm).
  lengthMm: number | null;

  source: PvcFittingDimensionSourceFlag;

  // Foreign key into packages/product-data/pvc/sources.ts
  // PVC_CATALOGUE_SOURCES registry. String FK because the source
  // list lives in code, not in the DB — adding a new catalogue is
  // a TS change, not a migration.
  sourceId: string;

  notes: string | null;

  createdAt: Date;

  updatedAt: Date;
}
