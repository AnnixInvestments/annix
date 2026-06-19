import { FittingVariant } from "../../fitting-variant/entities/fitting-variant.entity";
import { NominalOutsideDiameterMm } from "../../nominal-outside-diameter-mm/entities/nominal-outside-diameter-mm.entity";

export class FittingBore {
  id: number;

  borePositionName: string;

  nominalOutsideDiameter: NominalOutsideDiameterMm;

  variant: FittingVariant;
}
