import { ForgedFittingSeries } from "./forged-fitting-series.entity";
import { ForgedFittingType } from "./forged-fitting-type.entity";

export class ForgedFittingDimension {
  id: number;

  seriesId: number;

  series: ForgedFittingSeries;

  fittingTypeId: number;

  fittingType: ForgedFittingType;

  nominalBoreMm: number;

  dimensionAMm: number | null;

  dimensionBMm: number | null;

  dimensionCMm: number | null;

  dimensionDMm: number | null;

  dimensionEMm: number | null;

  massKg: number | null;

  socketDepthMm: number | null;

  minWallThicknessMm: number | null;
}
