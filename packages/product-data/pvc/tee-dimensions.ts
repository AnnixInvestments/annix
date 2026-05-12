// PVC injection-moulded tee dimensions (SANS 1601 range, DN 20–160).
// All tees are 90° branch. Larger tees (DN ≥ 200) are site-fabricated.
//
// Z = centre-to-face along the run (matching elbow Z).
// W = centre-to-face on the branch.
// For equal tees Z == W; for reducing tees the branch W follows the
// branch DN.

import { pvcCatalogueSource } from "./sources";

export interface PvcTeeDimension {
  mainDnMm: number;
  branchDnMm: number;
  // Centre-to-face along the run, mm.
  runCenterToFaceMm: number;
  // Centre-to-face on the branch, mm.
  branchCenterToFaceMm: number;
  sourceId: string;
  estimated?: boolean;
}

// Equal tees (run DN = branch DN).
const EQUAL_TEES: PvcTeeDimension[] = [
  {
    mainDnMm: 20,
    branchDnMm: 20,
    runCenterToFaceMm: 22,
    branchCenterToFaceMm: 22,
    sourceId: "marley-product-catalogue",
  },
  {
    mainDnMm: 25,
    branchDnMm: 25,
    runCenterToFaceMm: 26,
    branchCenterToFaceMm: 26,
    sourceId: "marley-product-catalogue",
  },
  {
    mainDnMm: 32,
    branchDnMm: 32,
    runCenterToFaceMm: 31,
    branchCenterToFaceMm: 31,
    sourceId: "marley-product-catalogue",
  },
  {
    mainDnMm: 40,
    branchDnMm: 40,
    runCenterToFaceMm: 37,
    branchCenterToFaceMm: 37,
    sourceId: "marley-product-catalogue",
  },
  {
    mainDnMm: 50,
    branchDnMm: 50,
    runCenterToFaceMm: 44,
    branchCenterToFaceMm: 44,
    sourceId: "marley-product-catalogue",
  },
  {
    mainDnMm: 63,
    branchDnMm: 63,
    runCenterToFaceMm: 53,
    branchCenterToFaceMm: 53,
    sourceId: "marley-product-catalogue",
  },
  {
    mainDnMm: 75,
    branchDnMm: 75,
    runCenterToFaceMm: 62,
    branchCenterToFaceMm: 62,
    sourceId: "macneil-2025-catalogue",
  },
  {
    mainDnMm: 90,
    branchDnMm: 90,
    runCenterToFaceMm: 73,
    branchCenterToFaceMm: 73,
    sourceId: "macneil-2025-catalogue",
  },
  {
    mainDnMm: 110,
    branchDnMm: 110,
    runCenterToFaceMm: 88,
    branchCenterToFaceMm: 88,
    sourceId: "macneil-2025-catalogue",
  },
  {
    mainDnMm: 125,
    branchDnMm: 125,
    runCenterToFaceMm: 99,
    branchCenterToFaceMm: 99,
    sourceId: "macneil-2025-catalogue",
  },
  {
    mainDnMm: 140,
    branchDnMm: 140,
    runCenterToFaceMm: 109,
    branchCenterToFaceMm: 109,
    sourceId: "macneil-2025-catalogue",
    estimated: true,
  },
  {
    mainDnMm: 160,
    branchDnMm: 160,
    runCenterToFaceMm: 124,
    branchCenterToFaceMm: 124,
    sourceId: "macneil-2025-catalogue",
  },
];

// Common reducing-tee patterns (main × branch). Many more
// combinations exist in catalogues — these are the most-stocked.
const REDUCING_TEES: PvcTeeDimension[] = [
  {
    mainDnMm: 50,
    branchDnMm: 25,
    runCenterToFaceMm: 44,
    branchCenterToFaceMm: 26,
    sourceId: "marley-product-catalogue",
  },
  {
    mainDnMm: 50,
    branchDnMm: 32,
    runCenterToFaceMm: 44,
    branchCenterToFaceMm: 31,
    sourceId: "marley-product-catalogue",
  },
  {
    mainDnMm: 50,
    branchDnMm: 40,
    runCenterToFaceMm: 44,
    branchCenterToFaceMm: 37,
    sourceId: "marley-product-catalogue",
  },
  {
    mainDnMm: 63,
    branchDnMm: 50,
    runCenterToFaceMm: 53,
    branchCenterToFaceMm: 44,
    sourceId: "marley-product-catalogue",
  },
  {
    mainDnMm: 75,
    branchDnMm: 50,
    runCenterToFaceMm: 62,
    branchCenterToFaceMm: 44,
    sourceId: "macneil-2025-catalogue",
  },
  {
    mainDnMm: 90,
    branchDnMm: 50,
    runCenterToFaceMm: 73,
    branchCenterToFaceMm: 44,
    sourceId: "macneil-2025-catalogue",
  },
  {
    mainDnMm: 90,
    branchDnMm: 75,
    runCenterToFaceMm: 73,
    branchCenterToFaceMm: 62,
    sourceId: "macneil-2025-catalogue",
  },
  {
    mainDnMm: 110,
    branchDnMm: 50,
    runCenterToFaceMm: 88,
    branchCenterToFaceMm: 44,
    sourceId: "macneil-2025-catalogue",
  },
  {
    mainDnMm: 110,
    branchDnMm: 75,
    runCenterToFaceMm: 88,
    branchCenterToFaceMm: 62,
    sourceId: "macneil-2025-catalogue",
  },
  {
    mainDnMm: 110,
    branchDnMm: 90,
    runCenterToFaceMm: 88,
    branchCenterToFaceMm: 73,
    sourceId: "macneil-2025-catalogue",
  },
  {
    mainDnMm: 160,
    branchDnMm: 110,
    runCenterToFaceMm: 124,
    branchCenterToFaceMm: 88,
    sourceId: "macneil-2025-catalogue",
  },
];

export const PVC_TEE_DIMENSIONS: PvcTeeDimension[] = [...EQUAL_TEES, ...REDUCING_TEES];

export const pvcTeeDimension = (mainDnMm: number, branchDnMm: number): PvcTeeDimension | null =>
  PVC_TEE_DIMENSIONS.find((t) => t.mainDnMm === mainDnMm && t.branchDnMm === branchDnMm) ?? null;

export const pvcTeeSource = (entry: PvcTeeDimension) => pvcCatalogueSource(entry.sourceId);
