import { Injectable, Optional } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { ClientSession, Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import { MongoTransactionContext } from "../../lib/persistence/transaction-context";
import { PaperTrade } from "../entities/paper-trade.entity";
import { type LedgerNetRow, PaperTradeRepository } from "./paper-trade.repository";

@Injectable()
export class MongoPaperTradeRepository
  extends MongoCrudRepository<PaperTrade>
  implements PaperTradeRepository
{
  constructor(
    @InjectModel("PaperTrade") model: Model<PaperTrade>,
    @Optional() session: ClientSession | null = null,
  ) {
    super(model, session);
  }

  async findByPortfolioWithAsset(portfolioId: string, take: number): Promise<PaperTrade[]> {
    const docs = await this.documents
      .find({ portfolioId })
      .populate("asset")
      .sort({ executedAt: -1 })
      .limit(take)
      .session(this.session)
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findEarliestBuy(portfolioId: string, assetId: string): Promise<PaperTrade | null> {
    const doc = await this.documents
      .findOne({ portfolioId, assetId, action: "buy" })
      .sort({ executedAt: 1 })
      .session(this.session)
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async ledgerNetByAsset(portfolioId: string): Promise<LedgerNetRow[]> {
    const docs = await this.documents
      .aggregate<{ _id: string; buyQty: number; sellQty: number; buyCost: number }>([
        { $match: { portfolioId, assetId: { $ne: null } } },
        {
          $group: {
            _id: "$assetId",
            buyQty: {
              $sum: { $cond: [{ $eq: ["$action", "buy"] }, "$quantity", 0] },
            },
            sellQty: {
              $sum: { $cond: [{ $eq: ["$action", "sell"] }, "$quantity", 0] },
            },
            buyCost: {
              $sum: {
                $cond: [{ $eq: ["$action", "buy"] }, { $multiply: ["$quantity", "$price"] }, 0],
              },
            },
          },
        },
      ])
      .session(this.session)
      .exec();
    return docs.map((doc) => ({
      assetId: String(doc._id),
      buyQty: String(doc.buyQty),
      sellQty: String(doc.sellQty),
      buyCost: String(doc.buyCost),
    }));
  }

  withTransaction(context: TransactionContext): MongoPaperTradeRepository {
    if (!(context instanceof MongoTransactionContext)) {
      throw new Error("MongoPaperTradeRepository requires a MongoTransactionContext");
    }
    return new MongoPaperTradeRepository(this.model, context.session);
  }
}
