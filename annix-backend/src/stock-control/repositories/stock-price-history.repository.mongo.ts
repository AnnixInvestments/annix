import { Injectable, Optional } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { ClientSession, Model } from "mongoose";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { MongoTenantScopedRepository } from "../../lib/persistence/mongo-tenant-scoped-repository";
import {
  MongoTransactionContext,
  type TransactionContext,
} from "../../lib/persistence/transaction-context";
import { StockPriceHistory } from "../entities/stock-price-history.entity";
import { StockPriceHistoryRepository } from "./stock-price-history.repository";

@Injectable()
export class MongoStockPriceHistoryRepository
  extends MongoTenantScopedRepository<StockPriceHistory>
  implements StockPriceHistoryRepository
{
  constructor(
    @InjectModel("StockPriceHistory") model: Model<StockPriceHistory>,
    @Optional() session: ClientSession | null = null,
  ) {
    super(model, session);
  }

  withTransaction(context: TransactionContext): MongoStockPriceHistoryRepository {
    if (!(context instanceof MongoTransactionContext)) {
      throw new Error("MongoStockPriceHistoryRepository requires a MongoTransactionContext");
    }
    return this.cloneForSession(context.session);
  }

  protected cloneForSession(session: ClientSession): MongoStockPriceHistoryRepository {
    return new MongoStockPriceHistoryRepository(this.model, session);
  }

  build(data: DeepPartial<StockPriceHistory>): StockPriceHistory {
    return data as StockPriceHistory;
  }

  async saveForCompany(companyId: number, entity: StockPriceHistory): Promise<StockPriceHistory> {
    if (entity.companyId !== companyId) {
      throw new Error("Stock price history does not belong to the requesting company");
    }
    return this.save(entity);
  }

  async removeForCompany(companyId: number, entity: StockPriceHistory): Promise<void> {
    if (entity.companyId !== companyId) {
      throw new Error("Stock price history does not belong to the requesting company");
    }
    await this.remove(entity);
  }

  async findForItemRecent(
    companyId: number,
    stockItemId: number,
    limit: number,
  ): Promise<StockPriceHistory[]> {
    const docs = await this.documents
      .find({ stockItemId, companyId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findForItemOrdered(companyId: number, stockItemId: number): Promise<StockPriceHistory[]> {
    const docs = await this.documents
      .find({ stockItemId, companyId })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async recentChangesForCompany(companyId: number, limit: number): Promise<StockPriceHistory[]> {
    const docs = await this.documents
      .find({ companyId })
      .populate(["stockItem"])
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
      .exec();
    return this.toDomainList(docs);
  }
}
