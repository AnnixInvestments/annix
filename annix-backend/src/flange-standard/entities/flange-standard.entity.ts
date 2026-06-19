import { FlangeDimension } from "../../flange-dimension/entities/flange-dimension.entity";

export class FlangeStandard {
  id: number;

  code: string; // e.g. "BS 4504", "SABS 1123", "BS 10"

  // cascade maybe
  flanges: FlangeDimension[];
}
