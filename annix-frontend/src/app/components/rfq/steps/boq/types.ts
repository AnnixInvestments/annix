export type MaterialKey = "hdpe" | "steel" | "pvc";

export type ConsolidatedItem = {
  description: string;
  qty: number;
  unit: string;
  weight: number;
  // Aggregated clientItemNumbers for the "From" column. May contain
  // duplicates when more than one source row used the same number
  // (common in multi-sheet BOQs).
  entries: string[];
  // Parallel array of source-entry IDs (one per push to entries).
  // Used to look up each source's true sheet+row independently —
  // keying by clientItemNumber alone collapses cross-sheet
  // collisions of the same number, e.g. an "a.1" on three different
  // enquiry sheets.
  entryIds: string[];
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
