export type MaterialKey = "hdpe" | "steel" | "pvc";

export type ConsolidatedItem = {
  description: string;
  qty: number;
  unit: string;
  weight: number;
  entries: string[];
  // e.g., { "Pipe Weld": 2.5, "Flange Weld": 1.2 }
  welds?: Record<string, number>;
  intAreaM2?: number;
  extAreaM2?: number;
  material?: MaterialKey;
};

export type FlangeCountByPhysicalKind = {
  fixed: number;
  loose: number;
  rotating: number;
};

export type FlangeCountByLocation = {
  main: number;
  branch: number;
};
