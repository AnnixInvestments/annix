import { Bolt } from "../../bolt/entities/bolt.entity";
import { FlangePressureClass } from "../../flange-pressure-class/entities/flange-pressure-class.entity";
import { FlangeStandard } from "../../flange-standard/entities/flange-standard.entity";
import { FlangeType } from "../../flange-type/entities/flange-type.entity";
import { NominalOutsideDiameterMm } from "../../nominal-outside-diameter-mm/entities/nominal-outside-diameter-mm.entity";

export class FlangeDimension {
  id: number;

  nominalOutsideDiameter: NominalOutsideDiameterMm;

  standard: FlangeStandard;

  pressureClass: FlangePressureClass;

  flangeType: FlangeType | null;

  D: number;

  b: number;

  d4: number;

  f: number;

  num_holes: number;

  d1: number;

  bolt?: Bolt;

  boltLengthMm?: number;

  pcd: number;

  mass_kg: number;
}
