import { NominalOutsideDiameterMm } from "../../nominal-outside-diameter-mm/entities/nominal-outside-diameter-mm.entity";
import { PipePressure } from "../../pipe-pressure/entities/pipe-pressure.entity";
import { SteelSpecification } from "../../steel-specification/entities/steel-specification.entity";

export class PipeDimension {
  id: number;

  wall_thickness_mm: number;

  internal_diameter_mm: number | null;

  mass_kgm: number;

  schedule_designation: string | null;

  schedule_number: number | null;

  nominalOutsideDiameter: NominalOutsideDiameterMm;

  pressures: PipePressure[];

  steelSpecification: SteelSpecification;
}
