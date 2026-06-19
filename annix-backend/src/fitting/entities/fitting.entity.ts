import { FittingType } from "../../fitting-type/entities/fitting-type.entity";
import { FittingVariant } from "../../fitting-variant/entities/fitting-variant.entity";
import { SteelSpecification } from "../../steel-specification/entities/steel-specification.entity";

export class Fitting {
  id: number;

  steelSpecification: SteelSpecification;

  fittingType: FittingType;

  variants: FittingVariant[];
}
