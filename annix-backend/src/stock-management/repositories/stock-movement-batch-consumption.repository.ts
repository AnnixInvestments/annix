import { CrudRepository, type DeepPartial } from "../../lib/persistence/crud-repository";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import { StockMovementBatchConsumption } from "../entities/stock-movement-batch-consumption.entity";

export abstract class StockMovementBatchConsumptionRepository extends CrudRepository<StockMovementBatchConsumption> {
  abstract build(data: DeepPartial<StockMovementBatchConsumption>): StockMovementBatchConsumption;
  abstract withTransaction(context: TransactionContext): StockMovementBatchConsumptionRepository;
  abstract findHistoryForProduct(
    companyId: number,
    productId: number,
    limit: number,
  ): Promise<StockMovementBatchConsumption[]>;
}
