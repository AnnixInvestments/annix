import { FittingDimension } from "../../fitting-dimension/entities/fitting-dimension.entity";

export class AngleRange {
  id: number;

  angle_min: number;

  angle_max: number;

  fittingDimensions: FittingDimension[];
}
