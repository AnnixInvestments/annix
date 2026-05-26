import { CrudRepository } from "../lib/persistence/crud-repository";
import { HdpeFittingWeight } from "./entities/hdpe-fitting-weight.entity";

export abstract class HdpeFittingWeightRepository extends CrudRepository<HdpeFittingWeight> {
  abstract findByFittingTypeId(fittingTypeId: number): Promise<HdpeFittingWeight[]>;
  abstract findByFittingTypeIdAndNominalBore(
    fittingTypeId: number,
    nominalBore: number,
  ): Promise<HdpeFittingWeight | null>;
}
