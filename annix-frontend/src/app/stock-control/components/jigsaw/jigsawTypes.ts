export interface JigsawPanel {
  panelId: string;
  itemId: string;
  itemNo: string | null;
  description: string;
  widthMm: number;
  lengthMm: number;
  rotated: boolean;
  colorIndex: number;
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
