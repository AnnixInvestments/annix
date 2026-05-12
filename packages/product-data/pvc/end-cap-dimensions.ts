// PVC injection-moulded end-cap (blind cap / socket cap) dimensions.
// Length from cap face to the back of the socket, mm. SANS 1601
// range, DN 20 – 160.

import { pvcCatalogueSource } from "./sources";

export interface PvcEndCapDimension {
  dnMm: number;
  // Overall length from cap face to socket back, mm.
  lengthMm: number;
  sourceId: string;
  estimated?: boolean;
}

export const PVC_END_CAP_DIMENSIONS: PvcEndCapDimension[] = [
  { dnMm: 20, lengthMm: 16, sourceId: "marley-product-catalogue" },
  { dnMm: 25, lengthMm: 19, sourceId: "marley-product-catalogue" },
  { dnMm: 32, lengthMm: 22, sourceId: "marley-product-catalogue" },
  { dnMm: 40, lengthMm: 26, sourceId: "marley-product-catalogue" },
  { dnMm: 50, lengthMm: 30, sourceId: "marley-product-catalogue" },
  { dnMm: 63, lengthMm: 35, sourceId: "marley-product-catalogue" },
  { dnMm: 75, lengthMm: 40, sourceId: "macneil-2025-catalogue" },
  { dnMm: 90, lengthMm: 46, sourceId: "macneil-2025-catalogue" },
  { dnMm: 110, lengthMm: 54, sourceId: "macneil-2025-catalogue" },
  { dnMm: 125, lengthMm: 60, sourceId: "macneil-2025-catalogue" },
  { dnMm: 140, lengthMm: 66, sourceId: "macneil-2025-catalogue", estimated: true },
  { dnMm: 160, lengthMm: 74, sourceId: "macneil-2025-catalogue" },
];

export const pvcEndCapLength = (dnMm: number): number | null => {
  const entry = PVC_END_CAP_DIMENSIONS.find((d) => d.dnMm === dnMm);
  return entry?.lengthMm ?? null;
};

export const pvcEndCapSource = (entry: PvcEndCapDimension) => pvcCatalogueSource(entry.sourceId);
