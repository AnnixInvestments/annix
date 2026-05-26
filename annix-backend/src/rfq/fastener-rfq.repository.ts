import { CrudRepository } from "../lib/persistence/crud-repository";
import { FastenerRfq } from "./entities/fastener-rfq.entity";

export abstract class FastenerRfqRepository extends CrudRepository<FastenerRfq> {}
