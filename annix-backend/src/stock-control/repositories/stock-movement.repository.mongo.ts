import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { ReferenceType, StockMovement } from "../entities/stock-movement.entity";
import {
  type MovementHistoryFilters,
  type MovementListFilters,
  StockMovementRepository,
} from "./stock-movement.repository";

@Injectable()
export class MongoStockMovementRepository
  extends MongoCrudRepository<StockMovement>
  implements StockMovementRepository
{
  constructor(@InjectModel("StockMovement") model: Model<StockMovement>) {
    super(model);
  }

  build(data: DeepPartial<StockMovement>): StockMovement {
    return data as StockMovement;
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
