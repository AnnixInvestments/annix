import { CrudRepository } from "../lib/persistence/crud-repository";
import { ExpansionJointRfq } from "./entities/expansion-joint-rfq.entity";

export abstract class ExpansionJointRfqRepository extends CrudRepository<ExpansionJointRfq> {}
