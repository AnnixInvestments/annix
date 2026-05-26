import { CrudRepository } from "../lib/persistence/crud-repository";
import { ValveRfq } from "./entities/valve-rfq.entity";

export abstract class ValveRfqRepository extends CrudRepository<ValveRfq> {}
