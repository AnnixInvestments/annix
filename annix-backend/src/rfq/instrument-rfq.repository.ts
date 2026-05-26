import { CrudRepository } from "../lib/persistence/crud-repository";
import { InstrumentRfq } from "./entities/instrument-rfq.entity";

export abstract class InstrumentRfqRepository extends CrudRepository<InstrumentRfq> {}
