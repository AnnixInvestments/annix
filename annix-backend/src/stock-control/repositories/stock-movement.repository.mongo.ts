import { Injectable, Optional } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { ClientSession, Model } from "mongoose";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { MongoTenantScopedRepository } from "../../lib/persistence/mongo-tenant-scoped-repository";
import {
  MongoTransactionContext,
  type TransactionContext,
} from "../../lib/persistence/transaction-context";
import { ReferenceType, StockMovement } from "../entities/stock-movement.entity";
import {
  type MovementHistoryFilters,
  type MovementListFilters,
  StockMovementRepository,
} from "./stock-movement.repository";

@Injectable()
export class MongoStockMovementRepository
  extends MongoTenantScopedRepository<StockMovement>
  implements StockMovementRepository
{
  constructor(
    @InjectModel("StockMovement") model: Model<StockMovement>,
    @Optional() session: ClientSession | null = null,
  ) {
    super(model, session);
  }

  withTransaction(context: TransactionContext): MongoStockMovementRepository {
    if (!(context instanceof MongoTransactionContext)) {
      throw new Error("MongoStockMovementRepository requires a MongoTransactionContext");
    }
    return this.cloneForSession(context.session);
  }

  protected cloneForSession(session: ClientSession): MongoStockMovementRepository {
    return new MongoStockMovementRepository(this.model, session);
  }

  build(data: DeepPartial<StockMovement>): StockMovement {
    return data as StockMovement;
  }

  async saveForCompany(companyId: number, entity: StockMovement): Promise<StockMovement> {
    if (entity.companyId !== companyId) {
      throw new Error("Stock movement does not belong to the requesting company");
    }
    return this.save(entity);
  }

  async removeForCompany(companyId: number, entity: StockMovement): Promise<void> {
    if (entity.companyId !== companyId) {
      throw new Error("Stock movement does not belong to the requesting company");
    }
    await this.remove(entity);
  }

  async findManyByStockItemForCompany(
    companyId: number,
    stockItemId: number,
  ): Promise<StockMovement[]> {
    const docs = await this.documents.find({ companyId, stockItemId }).lean().exec();
    return this.toDomainList(docs);
  }

  async findManyByReferenceForCompany(
    companyId: number,
    referenceType: string,
    referenceId: number,
  ): Promise<StockMovement[]> {
    const docs = await this.documents.find({ companyId, referenceType, referenceId }).lean().exec();
    return this.toDomainList(docs);
  }

  async findFilteredForCompany(
    companyId: number,
    filters: MovementListFilters | undefined,
    page: number,
    limit: number,
  ): Promise<StockMovement[]> {
    const query: Record<string, unknown> = { companyId };

    if (filters?.stockItemId) {
      query.stockItemId = filters.stockItemId;
    }

    if (filters?.movementType) {
      query.movementType = filters.movementType;
    }

    if (filters?.startDate && filters?.endDate) {
      query.createdAt = {
        $gte: new Date(filters.startDate),
        $lte: new Date(filters.endDate),
      };
    }

    const docs = await this.documents
      .find(query)
      .populate(["stockItem"])
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findByItemForCompany(companyId: number, stockItemId: number): Promise<StockMovement[]> {
    const docs = await this.documents
      .find({ stockItemId, companyId })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async recentActivityForCompany(companyId: number, limit: number): Promise<StockMovement[]> {
    const docs = await this.documents
      .find({ companyId })
      .populate(["stockItem"])
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  countCreatedSinceForCompany(companyId: number, since: Date): Promise<number> {
    return this.documents.countDocuments({ companyId, createdAt: { $gte: since } }).exec();
  }

  async movementHistoryForCompany(
    companyId: number,
    filters: MovementHistoryFilters | undefined,
  ): Promise<StockMovement[]> {
    const query: Record<string, unknown> = { companyId };
    const createdAt: Record<string, unknown> = {};

    if (filters?.startDate) {
      createdAt.$gte = new Date(filters.startDate);
    }
    if (filters?.endDate) {
      createdAt.$lte = new Date(filters.endDate);
    }
    if (Object.keys(createdAt).length > 0) {
      query.createdAt = createdAt;
    }
    if (filters?.movementType) {
      query.movementType = filters.movementType;
    }
    if (filters?.stockItemId) {
      query.stockItemId = filters.stockItemId;
    }

    const docs = await this.documents
      .find(query)
      .populate(["stockItem"])
      .sort({ createdAt: -1 })
      .limit(500)
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findForItemSinceExcludingStockTake(
    companyId: number,
    stockItemId: number,
    since: Date,
  ): Promise<StockMovement[]> {
    const docs = await this.documents
      .find({
        stockItemId,
        companyId,
        createdAt: { $gt: since },
        referenceType: { $ne: ReferenceType.STOCK_TAKE },
      })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }
}
