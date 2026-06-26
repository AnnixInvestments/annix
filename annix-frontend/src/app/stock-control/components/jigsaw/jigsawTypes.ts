export interface PanelDimensionContext {
  nbMm: number | null;
  odMm: number | null;
  schedule: string | null;
  lengthMm: number;
  flangeConfig: string | null;
  itemType: string | null;
  // Internal rubber-lining thickness (mm) for this piece. Tank/chute plates
  // can have mixed thicknesses across one assembly, so each piece carries its
  // own value to nest onto the correct-thickness roll. Null for pipe panels
  // (their thickness is implied by roll selection).
  liningThicknessMm?: number | null;
}

// The developed (flat-pattern) outline of a panel. Absent means a plain rectangle
// (the default for every pipe/plate panel), so `shape` is optional everywhere and
// fully backward-compatible. Non-rectangular panels still carry a bounding
// widthMm/lengthMm so the existing skyline packer nests them by bounding box.
// This is the single canonical definition; the backend mirrors it structurally on
// CutPiece in annix-backend/src/stock-control/lib/rubberCuttingCalculator.ts.
export type PanelShape =
  | { type: "rectangle" }
  | {
      type: "annular_sector";
      innerRadiusMm: number;
      outerRadiusMm: number;
      sweepAngleDegrees: number;
    }
  | { type: "circle"; radiusMm: number }
  | { type: "annulus"; innerRadiusMm: number; outerRadiusMm: number }
  | { type: "petal"; baseWidthMm: number; heightMm: number; tipWidthMm: number }
  | { type: "saddle_wrap"; odMm: number; branchOdMm: number };

export interface JigsawPanel {
  panelId: string;
  itemId: string;
  itemNo: string | null;
  description: string;
  widthMm: number;
  lengthMm: number;
  originalWidthMm: number;
  originalLengthMm: number;
  rotated: boolean;
  colorIndex: number;
  dimensionContext: PanelDimensionContext;
  shape?: PanelShape;
}

export interface PlacedPanel extends JigsawPanel {
  rollIndex: number;
  xMm: number;
  yMm: number;
}

export interface JigsawRoll {
  widthMm: number;
  lengthMm: number;
  thicknessMm: number;
}

const SNAP_GRID_MM = 10;

export function effectiveWidth(panel: JigsawPanel): number {
  return panel.rotated ? panel.lengthMm : panel.widthMm;
}

export function effectiveLength(panel: JigsawPanel): number {
  return panel.rotated ? panel.widthMm : panel.lengthMm;
}

export function snapToGrid(valueMm: number): number {
  return Math.round(valueMm / SNAP_GRID_MM) * SNAP_GRID_MM;
}
