import { Fitting } from "../../fitting/entities/fitting.entity";
import { FittingBore } from "../../fitting-bore/entities/fitting-bore.entity";
import { FittingDimension } from "../../fitting-dimension/entities/fitting-dimension.entity";

export class FittingVariant {
  id: number;

  fitting: Fitting;

  bores: FittingBore[];

  dimensions: FittingDimension[];
}
