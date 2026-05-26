import { CrudRepository } from "../lib/persistence/crud-repository";
import { RetainingRingWeight } from "./entities/retaining-ring-weight.entity";

export abstract class RetainingRingWeightRepository extends CrudRepository<RetainingRingWeight> {
  abstract findAllOrdered(): Promise<RetainingRingWeight[]>;
  abstract findByNominalBore(nominalBoreMm: number): Promise<RetainingRingWeight | null>;
}
