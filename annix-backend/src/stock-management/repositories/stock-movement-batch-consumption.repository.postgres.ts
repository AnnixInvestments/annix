import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, type DeepPartial as TypeOrmDeepPartial } from "typeorm";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import {
  type TransactionContext,
  TypeOrmTransactionContext,
} from "../../lib/persistence/transaction-context";
import { TypeOrmCrudRepository } from "../../lib/persistence/typeorm-crud-repository";
import { StockMovementBatchConsumption } from "../entities/stock-movement-batch-consumption.entity";
import { StockMovementBatchConsumptionRepository } from "./stock-movement-batch-consumption.repository";

@Injectable()
export class PostgresStockMovementBatchConsumptionRepository
  extends TypeOrmCrudRepository<StockMovementBatchConsumption>
  implements StockMovementBatchConsumptionRepository
{
  constructor(
    @InjectRepository(StockMovementBatchConsumption)
    repository: Repository<StockMovementBatchConsumption>,
  ) {
    super(repository);
  }

  build(data: DeepPartial<StockMovementBatchConsumption>): StockMovementBatchConsumption {
    return this.repository.create(data as TypeOrmDeepPartial<StockMovementBatchConsumption>);
  }

  withTransaction(context: TransactionContext): PostgresStockMovementBatchConsumptionRepository {
    if (!(context instanceof TypeOrmTransactionContext)) {
      throw new Error(
        "PostgresStockMovementBatchConsumptionRepository requires a TypeOrmTransactionContext",
      );
    }
    return new PostgresStockMovementBatchConsumptionRepository(
      context.manager.getRepository(StockMovementBatchConsumption),
    );
  }

  findHistoryForProduct(
    companyId: number,
    productId: number,
    limit: number,
  ): Promise<StockMovementBatchConsumption[]> {
    return this.repository.find({
      where: { companyId, productId },
      order: { consumedAt: "DESC", id: "DESC" },
      take: limit,
      relations: { purchaseBatch: true },
    });
  }

  findByPurchaseBatch(
    companyId: number,
    purchaseBatchId: number,
  ): Promise<StockMovementBatchConsumption[]> {
    return this.repository.find({ where: { companyId, purchaseBatchId } });
  }
}
