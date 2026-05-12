// PVC injection-moulded concentric reducer overall length (Z), mm.
// SANS 1601 range, DN 25 – 160.
//
// `lengthMm` is the spigot-to-spigot face length. Wall thickness on
// each end matches the parent pipe's class. Eccentric reducers are
// not in SANS 1601 — when needed they're fabricated (off-the-shelf
// concentric is the SA convention).

import { pvcCatalogueSource } from "./sources";

export interface PvcReducerDimension {
  mainDnMm: number;
  branchDnMm: number;
  lengthMm: number;
  sourceId: string;
  estimated?: boolean;
}

export const PVC_REDUCER_DIMENSIONS: PvcReducerDimension[] = [
  // 25 mm step-downs
  { mainDnMm: 32, branchDnMm: 25, lengthMm: 28, sourceId: "marley-product-catalogue" },
  { mainDnMm: 40, branchDnMm: 25, lengthMm: 35, sourceId: "marley-product-catalogue" },
  { mainDnMm: 40, branchDnMm: 32, lengthMm: 32, sourceId: "marley-product-catalogue" },
  { mainDnMm: 50, branchDnMm: 25, lengthMm: 45, sourceId: "marley-product-catalogue" },
  { mainDnMm: 50, branchDnMm: 32, lengthMm: 42, sourceId: "marley-product-catalogue" },
  { mainDnMm: 50, branchDnMm: 40, lengthMm: 38, sourceId: "marley-product-catalogue" },
  { mainDnMm: 63, branchDnMm: 32, lengthMm: 55, sourceId: "marley-product-catalogue" },
  { mainDnMm: 63, branchDnMm: 50, lengthMm: 48, sourceId: "marley-product-catalogue" },
  { mainDnMm: 75, branchDnMm: 50, lengthMm: 60, sourceId: "macneil-2025-catalogue" },
  { mainDnMm: 75, branchDnMm: 63, lengthMm: 55, sourceId: "macneil-2025-catalogue" },
  { mainDnMm: 90, branchDnMm: 50, lengthMm: 75, sourceId: "macneil-2025-catalogue" },
  { mainDnMm: 90, branchDnMm: 63, lengthMm: 70, sourceId: "macneil-2025-catalogue" },
  { mainDnMm: 90, branchDnMm: 75, lengthMm: 65, sourceId: "macneil-2025-catalogue" },
  { mainDnMm: 110, branchDnMm: 50, lengthMm: 90, sourceId: "macneil-2025-catalogue" },
  { mainDnMm: 110, branchDnMm: 63, lengthMm: 85, sourceId: "macneil-2025-catalogue" },
  { mainDnMm: 110, branchDnMm: 75, lengthMm: 80, sourceId: "macneil-2025-catalogue" },
  { mainDnMm: 110, branchDnMm: 90, lengthMm: 75, sourceId: "macneil-2025-catalogue" },
  { mainDnMm: 125, branchDnMm: 110, lengthMm: 80, sourceId: "macneil-2025-catalogue" },
  { mainDnMm: 160, branchDnMm: 110, lengthMm: 130, sourceId: "macneil-2025-catalogue" },
  { mainDnMm: 160, branchDnMm: 125, lengthMm: 120, sourceId: "macneil-2025-catalogue" },
];

export const pvcReducerDimension = (
  mainDnMm: number,
  branchDnMm: number,
): PvcReducerDimension | null =>
  PVC_REDUCER_DIMENSIONS.find((r) => r.mainDnMm === mainDnMm && r.branchDnMm === branchDnMm) ??
  null;

export const pvcReducerSource = (entry: PvcReducerDimension) => pvcCatalogueSource(entry.sourceId);
