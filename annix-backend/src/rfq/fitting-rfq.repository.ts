import { CrudRepository } from "../lib/persistence/crud-repository";
import { FittingRfq } from "./entities/fitting-rfq.entity";

export abstract class FittingRfqRepository extends CrudRepository<FittingRfq> {}
