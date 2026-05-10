// Shared interfaces for HDPE PE100 SDR 11 butt-fusion fitting body
// dimensions. Per-fitting-type tables live in dedicated modules
// (elbow-dimensions.ts, tee-dimensions.ts, reducer-dimensions.ts,
// lateral-dimensions.ts, end-cap-dimensions.ts) — this module
// holds only the type definitions they all share.

// Provenance flag for any catalogue lookup result. Lets the BOQ row
// builder distinguish real manufacturer-published values from
// interpolated / extrapolated proxies, so the description suffix can
// surface a "supplier to confirm" hint when appropriate.
export type DimensionSource = "catalogue" | "estimated";

// Common provenance fields shared across all dimension shapes.
// `source` is the broad classification (catalogue vs estimated);
// `sourceId` is a foreign key into HDPE_FITTING_DIMENSION_SOURCES
// in fitting-dimension-sources.ts (e.g. "hdpepolyfittings",
// "strongbridge", "chuangrong"). For estimated values, sourceId
// names the nearest anchor catalogue so the quoter can judge how
// far the interpolation has stretched.
export interface DimensionProvenance {
  source?: DimensionSource;
  sourceId?: string;
}

export interface ElbowDims extends DimensionProvenance {
  // Face-to-face (mm) — total length of the moulded elbow body.
  faceToFaceMm: number;
  // Face-to-centre (mm) — distance from spigot face to bend
  // centreline intersection. The "C/F" dimension on a BOQ row.
  centreToFaceMm: number;
}

export interface TeeDims extends DimensionProvenance {
  // Run face-to-face (mm) — total length of the run section.
  runFaceToFaceMm: number;
  // Branch face-to-centre (mm) — distance from branch face to the
  // run centreline.
  branchFaceToCentreMm: number;
}

export interface LateralDims extends DimensionProvenance {
  // Run face-to-face (mm).
  runFaceToFaceMm: number;
  // Branch length (mm) — from branch face to the run-axis midpoint
  // along the branch.
  branchLengthMm: number;
  // Branch face-to-centre (mm) — perpendicular drop from branch face
  // to the run centreline.
  branchFaceToCentreMm: number;
}
