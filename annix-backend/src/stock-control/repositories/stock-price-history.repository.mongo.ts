import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { StockPriceHistory } from "../entities/stock-price-history.entity";
import { StockPriceHistoryRepository } from "./stock-price-history.repository";

@Injectable()
export class MongoStockPriceHistoryRepository
  extends MongoCrudRepository<StockPriceHistory>
  implements StockPriceHistoryRepository
{
  constructor(@InjectModel("StockPriceHistory") model: Model<StockPriceHistory>) {
    super(model);
  }

  build(data: DeepPartial<StockPriceHistory>): StockPriceHistory {
    return data as StockPriceHistory;
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
