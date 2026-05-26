import { CrudRepository } from "../lib/persistence/crud-repository";
import { PumpRfq } from "./entities/pump-rfq.entity";

export abstract class PumpRfqRepository extends CrudRepository<PumpRfq> {}
