import { isUndefined } from "es-toolkit/compat";

export interface PanelGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function clampPanelGeometryToViewport(
  geometry: PanelGeometry,
  minWidth: number,
  minHeight: number,
): PanelGeometry | null {
  if (isUndefined(globalThis.window)) {
    return null;
  }
  const values = [geometry.x, geometry.y, geometry.width, geometry.height];
  if (values.some((value) => !Number.isFinite(value))) {
    return null;
  }
  const width = Math.min(Math.max(geometry.width, minWidth), window.innerWidth);
  const height = Math.min(Math.max(geometry.height, minHeight), window.innerHeight);
  const x = Math.max(0, Math.min(geometry.x, window.innerWidth - width));
  const y = Math.max(0, Math.min(geometry.y, window.innerHeight - height));
  return { x, y, width, height };
}
