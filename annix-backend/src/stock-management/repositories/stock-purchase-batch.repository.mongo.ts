import { Injectable, Optional } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { ClientSession, Model } from "mongoose";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import {
  MongoTransactionContext,
  type TransactionContext,
} from "../../lib/persistence/transaction-context";
import {
  StockPurchaseBatch,
  type StockPurchaseBatchSourceType,
  type StockPurchaseBatchStatus,
} from "../entities/stock-purchase-batch.entity";
import {
  type CompanyValuationTotals,
  type ProductValuationTotals,
  StockPurchaseBatchRepository,
} from "./stock-purchase-batch.repository";

@Injectable()
export class MongoStockPurchaseBatchRepository
  extends MongoCrudRepository<StockPurchaseBatch>
  implements StockPurchaseBatchRepository
{
  constructor(
    @InjectModel("StockPurchaseBatch") model: Model<StockPurchaseBatch>,
    @Optional() session: ClientSession | null = null,
  ) {
    super(model, session);
  }

  build(data: DeepPartial<StockPurchaseBatch>): StockPurchaseBatch {
    return data as StockPurchaseBatch;
  }

  withTransaction(context: TransactionContext): MongoStockPurchaseBatchRepository {
    if (!(context instanceof MongoTransactionContext)) {
      throw new Error("MongoStockPurchaseBatchRepository requires a MongoTransactionContext");
    }
    return new MongoStockPurchaseBatchRepository(this.model, context.session);
  }

  async findActiveForProductLocked(
    companyId: number,
    productId: number,
  ): Promise<StockPurchaseBatch[]> {
    const docs = await this.documents
      .find({ companyId, productId, status: "active", quantityRemaining: { $gt: 0 } })
      .sort({ receivedAt: 1, _id: 1 })
      .session(this.session)
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async valuationForProduct(companyId: number, productId: number): Promise<ProductValuationTotals> {
    const docs = await this.documents
      .find({ companyId, productId, status: "active" })
      .lean()
      .exec();
    return docs.reduce<ProductValuationTotals>(
      (acc, doc) => {
        const remaining = Number(doc.quantityRemaining ?? 0);
        const cost = Number(doc.costPerUnit ?? 0);
        const isLegacy = Boolean(doc.isLegacyBatch);
        return {
          totalQuantity: acc.totalQuantity + remaining,
          totalValueR: acc.totalValueR + remaining * cost,
          legacyQuantity: acc.legacyQuantity + (isLegacy ? remaining : 0),
          legacyValueR: acc.legacyValueR + (isLegacy ? remaining * cost : 0),
          activeBatchCount: acc.activeBatchCount + 1,
        };
      },
      {
        totalQuantity: 0,
        totalValueR: 0,
        legacyQuantity: 0,
        legacyValueR: 0,
        activeBatchCount: 0,
      },
    );
  }

  async valuationForCompany(companyId: number): Promise<CompanyValuationTotals> {
    const docs = await this.documents.find({ companyId, status: "active" }).lean().exec();
    return docs.reduce<CompanyValuationTotals>(
      (acc, doc) => {
        const remaining = Number(doc.quantityRemaining ?? 0);
        const cost = Number(doc.costPerUnit ?? 0);
        const isLegacy = Boolean(doc.isLegacyBatch);
        return {
          totalValueR: acc.totalValueR + remaining * cost,
          legacyValueR: acc.legacyValueR + (isLegacy ? remaining * cost : 0),
          activeBatchCount: acc.activeBatchCount + 1,
        };
      },
      { totalValueR: 0, legacyValueR: 0, activeBatchCount: 0 },
    );
  }

  async findForProduct(
    companyId: number,
    productId: number,
    status: StockPurchaseBatchStatus | undefined,
  ): Promise<StockPurchaseBatch[]> {
    const query: Record<string, unknown> = { companyId, productId };
    if (status) {
      query.status = status;
    }
    const docs = await this.documents.find(query).sort({ receivedAt: 1, _id: 1 }).lean().exec();
    return this.toDomainList(docs);
  }

  async findLegacyForProduct(
    companyId: number,
    productId: number,
  ): Promise<StockPurchaseBatch | null> {
    const doc = await this.documents
      .findOne({ companyId, productId, isLegacyBatch: true })
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findBySourceRefs(
    companyId: number,
    sourceType: StockPurchaseBatchSourceType,
    sourceRefIds: number[],
  ): Promise<StockPurchaseBatch[]> {
    if (sourceRefIds.length === 0) {
      return [];
    }
    const docs = await this.documents
      .find({ companyId, sourceType, sourceRefId: { $in: sourceRefIds } })
      .sort({ receivedAt: 1, _id: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }
}
