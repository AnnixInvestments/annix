import { CrudRepository } from "../lib/persistence/crud-repository";
import { BnwSetWeight } from "./entities/bnw-set-weight.entity";

export abstract class BnwSetWeightRepository extends CrudRepository<BnwSetWeight> {
  abstract availablePressureClasses(): Promise<string[]>;
}
