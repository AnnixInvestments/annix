import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { nestPopulate } from "../../lib/persistence/nest-populate";
import { StockItem } from "../entities/stock-item.entity";
import {
  type SohByLocationRow,
  type SohSummaryRow,
  type StockItemListFilters,
  StockItemRepository,
} from "./stock-item.repository";

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

@Injectable()
export class MongoStockItemRepository
  extends MongoCrudRepository<StockItem>
  implements StockItemRepository
{
  constructor(@InjectModel("StockItem") model: Model<StockItem>) {
    super(model);
  }

  build(data: DeepPartial<StockItem>): StockItem {
    return data as StockItem;
  }

  buildMany(rows: DeepPartial<StockItem>[]): StockItem[] {
    return rows as StockItem[];
  }

  async saveMany(entities: StockItem[]): Promise<StockItem[]> {
    return Promise.all(entities.map((entity) => this.save(entity)));
  }

  async updateById(id: number, updates: DeepPartial<StockItem>): Promise<void> {
    await this.documents.updateOne({ _id: id }, { $set: updates }).exec();
  }

  async updateByIdForCompany(
    id: number,
    companyId: number,
    updates: DeepPartial<StockItem>,
  ): Promise<void> {
    await this.documents.updateOne({ _id: id, companyId }, { $set: updates }).exec();
  }

  async incrementQuantityById(id: number, amount: number): Promise<void> {
    await this.documents.updateOne({ _id: id }, { $inc: { quantity: amount } }).exec();
  }

  async findOneForCompany(id: number, companyId: number): Promise<StockItem | null> {
    const doc = await this.documents.findOne({ _id: id, companyId }).lean().exec();
    return this.toDomain(doc);
  }

  async findOneForCompanyWithRelations(
    id: number,
    companyId: number,
    relations: string[],
  ): Promise<StockItem | null> {
    const doc = await this.documents
      .findOne({ _id: id, companyId })
      .populate(nestPopulate(relations))
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findOneBySkuForCompany(sku: string, companyId: number): Promise<StockItem | null> {
    const doc = await this.documents.findOne({ sku, companyId }).lean().exec();
    return this.toDomain(doc);
  }

  async findOneWastageForCompany(
    companyId: number,
    sku: string,
    category: string,
  ): Promise<StockItem | null> {
    const doc = await this.documents.findOne({ companyId, sku, category }).lean().exec();
    return this.toDomain(doc);
  }

  async findByIdsForCompanyOrderedByName(ids: number[], companyId: number): Promise<StockItem[]> {
    const docs = await this.documents
      .find({ _id: { $in: ids }, companyId })
      .sort({ name: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findAllForCompany(companyId: number): Promise<StockItem[]> {
    const docs = await this.documents.find({ companyId }).lean().exec();
    return this.toDomainList(docs);
  }

  async findAllForCompanyOrderedByName(companyId: number): Promise<StockItem[]> {
    const docs = await this.documents.find({ companyId }).sort({ name: 1 }).lean().exec();
    return this.toDomainList(docs);
  }

  async findForCompanySelectMatch(companyId: number): Promise<StockItem[]> {
    const docs = await this.documents.find({ companyId }).lean().exec();
    return this.toDomainList(docs);
  }

  async findUncategorizedForCompany(companyId: number): Promise<StockItem[]> {
    const docs = await this.documents
      .find({ companyId, category: null })
      .sort({ name: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findRubberCategoryForCompanyOrderedByName(companyId: number): Promise<StockItem[]> {
    const docs = await this.documents
      .find({ companyId, category: "RUBBER" })
      .sort({ name: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findRubberInStockForCompanyOrdered(companyId: number): Promise<StockItem[]> {
    const docs = await this.documents
      .find({ companyId, category: { $regex: "rubber", $options: "i" }, quantity: { $gt: 0 } })
      .sort({ thicknessMm: 1, widthMm: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findRubberInStockForCompany(companyId: number): Promise<StockItem[]> {
    const docs = await this.documents
      .find({ companyId, category: { $regex: "rubber", $options: "i" }, quantity: { $gt: 0 } })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findLeftoverForCompany(companyId: number): Promise<StockItem[]> {
    const docs = await this.documents.find({ companyId, isLeftover: true }).lean().exec();
    return this.toDomainList(docs);
  }

  async findByTermForCompany(companyId: number, term: string): Promise<StockItem[]> {
    const pattern = { $regex: escapeRegex(term), $options: "i" };
    const docs = await this.documents
      .find({
        companyId,
        $or: [{ name: pattern }, { category: pattern }, { description: pattern }],
      })
      .limit(10)
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  private locationFilter(locationId: string | undefined): Record<string, unknown> {
    if (locationId === "null") {
      return { locationId: null };
    }
    if (locationId) {
      const parsed = Number(locationId);
      if (Number.isInteger(parsed) && parsed > 0) {
        return { locationId: parsed };
      }
    }
    return {};
  }

  async findFilteredForCompany(
    companyId: number,
    filters: StockItemListFilters,
    skip: number,
    limit: number,
  ): Promise<{ items: StockItem[]; total: number }> {
    const query: Record<string, unknown> = {
      companyId,
      ...this.locationFilter(filters.locationId),
    };
    if (filters.category) {
      query.category = filters.category;
    }
    if (filters.belowMinStock) {
      query.$expr = { $lte: ["$quantity", "$minStockLevel"] };
    }
    const cursor = this.documents.find(query).sort({ name: 1 });
    if (limit > 0) {
      cursor.skip(skip).limit(limit);
    }
    const [docs, total] = await Promise.all([
      cursor.lean().exec(),
      this.documents.countDocuments(query).exec(),
    ]);
    return { items: this.toDomainList(docs), total };
  }

  async searchForCompany(
    companyId: number,
    search: string,
    skip: number,
    limit: number,
    belowMinStock: boolean,
    locationId?: string,
  ): Promise<{ items: StockItem[]; total: number }> {
    const pattern = { $regex: escapeRegex(search), $options: "i" };
    const query: Record<string, unknown> = {
      companyId,
      $or: [{ name: pattern }, { sku: pattern }, { description: pattern }],
      ...this.locationFilter(locationId),
    };
    if (belowMinStock) {
      query.$expr = { $lte: ["$quantity", "$minStockLevel"] };
    }
    const cursor = this.documents.find(query).sort({ name: 1 });
    if (limit > 0) {
      cursor.skip(skip).limit(limit);
    }
    const [docs, total] = await Promise.all([
      cursor.lean().exec(),
      this.documents.countDocuments(query).exec(),
    ]);
    return { items: this.toDomainList(docs), total };
  }

  async searchSummaryForCompany(
    companyId: number,
    pattern: string,
    limit: number,
  ): Promise<StockItem[]> {
    const term = pattern.replace(/%/g, "");
    const regex = { $regex: escapeRegex(term), $options: "i" };
    const docs = await this.documents
      .find({
        companyId,
        $or: [{ name: regex }, { sku: regex }, { description: regex }, { category: regex }],
      })
      .sort({ updatedAt: -1 })
      .limit(limit)
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async groupedForCompany(
    companyId: number,
    search: string | undefined,
    locationId: number | null,
    skip: number,
    limit: number,
  ): Promise<{ items: StockItem[]; total: number }> {
    const query: Record<string, unknown> = { companyId };
    if (search) {
      const pattern = { $regex: escapeRegex(search), $options: "i" };
      query.$or = [{ name: pattern }, { sku: pattern }, { description: pattern }];
    }
    if (locationId) {
      query.locationId = locationId;
    }
    const [docs, total] = await Promise.all([
      this.documents
        .find(query)
        .sort({ category: 1, name: 1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.documents.countDocuments(query).exec(),
    ]);
    return { items: this.toDomainList(docs), total };
  }

  async categoriesForCompany(companyId: number): Promise<string[]> {
    const categories = await this.documents
      .distinct("category", { companyId, category: { $ne: null } })
      .exec();
    return (categories as string[]).sort();
  }

  async totalValueForCompany(companyId: number): Promise<number> {
    const result = await this.documents
      .aggregate([
        { $match: { companyId } },
        {
          $group: {
            _id: null,
            totalValue: { $sum: { $multiply: ["$quantity", "$costPerUnit"] } },
          },
        },
      ])
      .exec();
    return Number(result[0]?.totalValue || 0);
  }

  lowStockCountForCompany(companyId: number): Promise<number> {
    return this.documents
      .countDocuments({
        companyId,
        minStockLevel: { $gt: 0 },
        $expr: { $lte: ["$quantity", "$minStockLevel"] },
      })
      .exec();
  }

  reorderAlertCountForCompany(companyId: number): Promise<number> {
    return this.lowStockCountForCompany(companyId);
  }

  async reorderAlertsForCompany(companyId: number): Promise<StockItem[]> {
    const docs = await this.documents
      .find({
        companyId,
        minStockLevel: { $gt: 0 },
        $expr: { $lte: ["$quantity", "$minStockLevel"] },
      })
      .sort({ quantity: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async lowStockForCompany(companyId: number): Promise<StockItem[]> {
    const docs = await this.documents
      .find({ companyId, $expr: { $lte: ["$quantity", "$minStockLevel"] } })
      .sort({ quantity: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async sohSummaryForCompany(companyId: number): Promise<SohSummaryRow[]> {
    const rows = await this.documents
      .aggregate([
        { $match: { companyId } },
        {
          $group: {
            _id: { $ifNull: ["$category", "Uncategorized"] },
            totalQuantity: { $sum: "$quantity" },
            totalValue: { $sum: { $multiply: ["$quantity", "$costPerUnit"] } },
          },
        },
        { $sort: { _id: 1 } },
      ])
      .exec();
    return rows.map((r) => ({
      category: r._id as string,
      totalQuantity: Number(r.totalQuantity),
      totalValue: Number(r.totalValue),
    }));
  }

  async sohByLocationForCompany(companyId: number): Promise<SohByLocationRow[]> {
    const rows = await this.documents
      .aggregate([
        { $match: { companyId } },
        {
          $group: {
            _id: { $ifNull: ["$location", "Unassigned"] },
            totalQuantity: { $sum: "$quantity" },
            totalValue: { $sum: { $multiply: ["$quantity", "$costPerUnit"] } },
          },
        },
        { $sort: { _id: 1 } },
      ])
      .exec();
    return rows.map((r) => ({
      location: r._id as string,
      totalQuantity: Number(r.totalQuantity),
      totalValue: Number(r.totalValue),
    }));
  }

  async overAllocationCountForCompany(companyId: number): Promise<number> {
    const rows = await this.documents
      .aggregate([
        { $match: { companyId } },
        {
          $lookup: {
            from: "stockallocations",
            let: { itemId: "$_id" },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ["$stockItemId", "$$itemId"] },
                  companyId,
                },
              },
              { $group: { _id: null, totalAllocated: { $sum: "$quantityUsed" } } },
            ],
            as: "alloc",
          },
        },
        { $unwind: "$alloc" },
        { $match: { $expr: { $gt: ["$alloc.totalAllocated", "$quantity"] } } },
        { $count: "count" },
      ])
      .exec();
    return Number(rows[0]?.count || 0);
  }

  async findOneByQrTokenForCompany(companyId: number, qrToken: string): Promise<StockItem | null> {
    const numericId = Number(qrToken);
    const conditions: Record<string, unknown>[] = [{ sku: qrToken }];
    if (Number.isInteger(numericId)) {
      conditions.push({ _id: numericId });
    }
    const doc = await this.documents.findOne({ companyId, $or: conditions }).lean().exec();
    return this.toDomain(doc);
  }

  async mostCommonLocationIdForCategory(
    companyId: number,
    category: string,
  ): Promise<number | null> {
    const rows = await this.documents
      .aggregate([
        { $match: { companyId, category, locationId: { $ne: null } } },
        { $group: { _id: "$locationId", cnt: { $sum: 1 } } },
        { $sort: { cnt: -1 } },
        { $limit: 1 },
      ])
      .exec();
    if (rows.length > 0) {
      return rows[0]._id as number;
    }
    return null;
  }
}
