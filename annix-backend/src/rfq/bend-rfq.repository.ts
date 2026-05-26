import { CrudRepository } from "../lib/persistence/crud-repository";
import { BendRfq } from "./entities/bend-rfq.entity";

export abstract class BendRfqRepository extends CrudRepository<BendRfq> {}
