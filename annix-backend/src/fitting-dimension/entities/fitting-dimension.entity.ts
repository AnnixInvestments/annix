import { AngleRange } from "../../angle-range/entities/angle-range.entity";
import { FittingVariant } from "../../fitting-variant/entities/fitting-variant.entity";

export class FittingDimension {
  id: number;

  dimension_name: string;

  dimension_value_mm: number;

  angleRange: AngleRange | null;

  variant: FittingVariant;
}
