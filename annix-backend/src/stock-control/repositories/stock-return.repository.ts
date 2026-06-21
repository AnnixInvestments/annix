import { CrudRepository } from "../../lib/persistence/crud-repository";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import { StockReturn } from "../entities/stock-return.entity";

export abstract class StockReturnRepository extends CrudRepository<StockReturn> {
  abstract withTransaction(context: TransactionContext): CrudRepository<StockReturn>;
}
