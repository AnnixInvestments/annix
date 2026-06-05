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
