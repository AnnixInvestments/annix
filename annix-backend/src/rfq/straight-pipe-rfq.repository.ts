import { CrudRepository } from "../lib/persistence/crud-repository";
import type { TransactionContext } from "../lib/persistence/transaction-context";
import { StraightPipeRfq } from "./entities/straight-pipe-rfq.entity";

export abstract class StraightPipeRfqRepository extends CrudRepository<StraightPipeRfq> {
  abstract withTransaction(context: TransactionContext): CrudRepository<StraightPipeRfq>;
}
