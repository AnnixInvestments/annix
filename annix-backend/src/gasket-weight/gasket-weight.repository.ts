import { FlangeDimension } from "../flange-dimension/entities/flange-dimension.entity";
import { CrudRepository } from "../lib/persistence/crud-repository";
import { GasketWeight } from "./entities/gasket-weight.entity";

export abstract class GasketWeightRepository extends CrudRepository<GasketWeight> {
  abstract findAllGaskets(): Promise<GasketWeight[]>;
  abstract findGasketByTypeAndBore(
    gasketType: string,
    nominalBoreMm: number,
  ): Promise<GasketWeight | null>;
  abstract findFlangeDimension(
    nominalBoreMm: number,
    pressureClass: string,
    flangeStandardCode?: string,
  ): Promise<FlangeDimension | null>;
  abstract findFlangeDimensionWithBolt(
    nominalBoreMm: number,
    pressureClass: string,
    flangeStandardCode?: string,
  ): Promise<FlangeDimension | null>;
  abstract distinctGasketTypes(): Promise<{ type: string }[]>;
}
