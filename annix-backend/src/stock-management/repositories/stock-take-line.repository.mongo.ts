import { Injectable, Optional } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { ClientSession, Model } from "mongoose";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import {
  MongoTransactionContext,
  type TransactionContext,
} from "../../lib/persistence/transaction-context";
import { StockTakeLine } from "../entities/stock-take-line.entity";
import { StockTakeLineRepository, type VarianceArchiveRow } from "./stock-take-line.repository";

@Injectable()
export class MongoStockTakeLineRepository
  extends MongoCrudRepository<StockTakeLine>
  implements StockTakeLineRepository
{
  constructor(
    @InjectModel("StockTakeLine") model: Model<StockTakeLine>,
    @Optional() session: ClientSession | null = null,
  ) {
    super(model, session);
  }

  build(data: DeepPartial<StockTakeLine>): StockTakeLine {
    return data as StockTakeLine;
  }

  withTransaction(context: TransactionContext): MongoStockTakeLineRepository {
    if (!(context instanceof MongoTransactionContext)) {
      throw new Error("MongoStockTakeLineRepository requires a MongoTransactionContext");
    }
    return new MongoStockTakeLineRepository(this.model, context.session);
  }

  async saveMany(lines: StockTakeLine[]): Promise<StockTakeLine[]> {
    return Promise.all(lines.map((line) => this.save(line)));
  }

  async findOneForStockTake(
    stockTakeId: number,
    productId: number,
    companyId: number,
  ): Promise<StockTakeLine | null> {
    const doc = await this.documents
      .findOne({ stockTakeId, productId, companyId })
      .session(this.session)
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findForStockTake(stockTakeId: number, companyId: number): Promise<StockTakeLine[]> {
    const docs = await this.documents
      .find({ stockTakeId, companyId })
      .session(this.session)
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async varianceArchive(companyId: number, monthsBack: number): Promise<VarianceArchiveRow[]> {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - monthsBack);
    const rows = await this.documents
      .aggregate<{
        _id: number;
        productSku: string;
        productName: string;
        stockTakeIds: number[];
        shortageCount: number;
        overageCount: number;
        totalVarianceQty: number;
        totalVarianceValueR: number;
        lastSeenAt: Date | null;
      }>([
        {
          $match: {
            companyId,
            varianceQty: { $ne: null, $not: { $eq: 0 } },
          },
        },
        {
          $lookup: {
            from: "stocktakes",
            localField: "stockTakeId",
            foreignField: "_id",
            as: "stockTake",
          },
        },
        { $unwind: "$stockTake" },
        {
          $match: {
            "stockTake.status": { $in: ["approved", "posted", "archived"] },
            "stockTake.createdAt": { $gt: cutoff },
          },
        },
        {
          $lookup: {
            from: "issuableproducts",
            localField: "productId",
            foreignField: "_id",
            as: "product",
          },
        },
        { $unwind: "$product" },
        {
          $group: {
            _id: "$productId",
            productSku: { $first: "$product.sku" },
            productName: { $first: "$product.name" },
            stockTakeIds: { $addToSet: "$stockTakeId" },
            shortageCount: {
              $sum: { $cond: [{ $lt: ["$varianceQty", 0] }, 1, 0] },
            },
            overageCount: {
              $sum: { $cond: [{ $gt: ["$varianceQty", 0] }, 1, 0] },
            },
            totalVarianceQty: { $sum: { $ifNull: ["$varianceQty", 0] } },
            totalVarianceValueR: { $sum: { $ifNull: ["$varianceValueR", 0] } },
            lastSeenAt: { $max: "$createdAt" },
          },
        },
        { $sort: { totalVarianceValueR: -1 } },
        { $limit: 100 },
      ])
      .exec();
    return rows.map((row) => ({
      productId: Number(row._id),
      productSku: row.productSku,
      productName: row.productName,
      stockTakeCount: row.stockTakeIds.length,
      shortageCount: Number(row.shortageCount),
      overageCount: Number(row.overageCount),
      totalVarianceQty: Number(row.totalVarianceQty),
      totalVarianceValueR: Number(row.totalVarianceValueR),
      lastSeenAt: row.lastSeenAt ? row.lastSeenAt.toISOString() : null,
    }));
  }
}
