import { Fitting } from "../../fitting/entities/fitting.entity";
import { PipeDimension } from "../../pipe-dimension/entities/pipe-dimension.entity";

export class SteelSpecification {
  id: number;

  steelSpecName: string;

  fittings: Fitting[];

  pipeDimensions: PipeDimension[];
}
