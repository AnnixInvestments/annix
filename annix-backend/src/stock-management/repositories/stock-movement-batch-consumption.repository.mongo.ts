import { Injectable, Optional } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { ClientSession, Model } from "mongoose";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import {
  MongoTransactionContext,
  type TransactionContext,
} from "../../lib/persistence/transaction-context";
import { StockMovementBatchConsumption } from "../entities/stock-movement-batch-consumption.entity";
import { StockMovementBatchConsumptionRepository } from "./stock-movement-batch-consumption.repository";

@Injectable()
export class MongoStockMovementBatchConsumptionRepository
  extends MongoCrudRepository<StockMovementBatchConsumption>
  implements StockMovementBatchConsumptionRepository
{
  constructor(
    @InjectModel("StockMovementBatchConsumption") model: Model<StockMovementBatchConsumption>,
    @Optional() session: ClientSession | null = null,
  ) {
    super(model, session);
  }

  build(data: DeepPartial<StockMovementBatchConsumption>): StockMovementBatchConsumption {
    return data as StockMovementBatchConsumption;
  }

  withTransaction(context: TransactionContext): MongoStockMovementBatchConsumptionRepository {
    if (!(context instanceof MongoTransactionContext)) {
      throw new Error(
        "MongoStockMovementBatchConsumptionRepository requires a MongoTransactionContext",
      );
    }
    return new MongoStockMovementBatchConsumptionRepository(this.model, context.session);
  }

  async findHistoryForProduct(
    companyId: number,
    productId: number,
    limit: number,
  ): Promise<StockMovementBatchConsumption[]> {
    const docs = await this.documents
      .find({ companyId, productId })
      .populate(["purchaseBatch"])
      .sort({ consumedAt: -1, _id: -1 })
      .limit(limit)
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findByPurchaseBatch(
    companyId: number,
    purchaseBatchId: number,
  ): Promise<StockMovementBatchConsumption[]> {
    const docs = await this.documents.find({ companyId, purchaseBatchId }).lean().exec();
    return this.toDomainList(docs);
  }
}
