import { CrudRepository, type DeepPartial } from "../../lib/persistence/crud-repository";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import { RubberOffcutStock } from "../entities/rubber-offcut-stock.entity";

export abstract class RubberOffcutStockRepository extends CrudRepository<RubberOffcutStock> {
  abstract build(data: DeepPartial<RubberOffcutStock>): RubberOffcutStock;
  abstract withTransaction(context: TransactionContext): RubberOffcutStockRepository;
}
