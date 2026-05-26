import { CrudRepository } from "../lib/persistence/crud-repository";
import { PvcFittingWeight } from "./entities/pvc-fitting-weight.entity";

export abstract class PvcFittingWeightRepository extends CrudRepository<PvcFittingWeight> {
  abstract findByFittingTypeId(fittingTypeId: number): Promise<PvcFittingWeight[]>;
  abstract findByFittingTypeIdAndDN(
    fittingTypeId: number,
    nominalDiameter: number,
    pressureRating?: number,
  ): Promise<PvcFittingWeight | null>;
}
