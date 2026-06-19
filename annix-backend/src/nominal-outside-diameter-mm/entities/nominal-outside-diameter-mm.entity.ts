import { FittingBore } from "../../fitting-bore/entities/fitting-bore.entity";
import { FlangeDimension } from "../../flange-dimension/entities/flange-dimension.entity";
import { PipeDimension } from "../../pipe-dimension/entities/pipe-dimension.entity";

// ensure that there are no duplicate combinations
export class NominalOutsideDiameterMm {
  id: number;

  nominal_diameter_mm: number;

  outside_diameter_mm: number;

  pipeDimensions: PipeDimension[];

  fittingBores: FittingBore[];

  flangeDimensions: FlangeDimension[];
}
