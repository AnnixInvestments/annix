import { FlangeDimension } from "../../flange-dimension/entities/flange-dimension.entity";
import { FlangeStandard } from "../../flange-standard/entities/flange-standard.entity";

export class FlangePressureClass {
  id: number;

  designation: string; // e.g. "6/3", "10/3", "T/D"

  pressureCategory: string | null; // "Low Pressure", "Medium Pressure", "High Pressure" - auto-filled for BS 10

  standard: FlangeStandard;

  flanges: FlangeDimension[];
}
