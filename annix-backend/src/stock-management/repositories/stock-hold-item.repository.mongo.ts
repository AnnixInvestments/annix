import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { type StockHoldDispositionStatus, StockHoldItem } from "../entities/stock-hold-item.entity";
import { StockHoldItemRepository } from "./stock-hold-item.repository";

@Injectable()
export class MongoStockHoldItemRepository
  extends MongoCrudRepository<StockHoldItem>
  implements StockHoldItemRepository
{
  constructor(@InjectModel("StockHoldItem") model: Model<StockHoldItem>) {
    super(model);
  }

  build(data: DeepPartial<StockHoldItem>): StockHoldItem {
    return data as StockHoldItem;
  }

  async findPendingForCompany(companyId: number): Promise<StockHoldItem[]> {
    const docs = await this.documents
      .find({ companyId, dispositionStatus: "pending" })
      .populate(["product", "stockTake"])
      .sort({ flaggedAt: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findAllForCompany(
    companyId: number,
    status: StockHoldDispositionStatus | undefined,
  ): Promise<StockHoldItem[]> {
    const query: Record<string, unknown> = { companyId };
    if (status) {
      query.dispositionStatus = status;
    }
    const docs = await this.documents
      .find(query)
      .populate(["product", "stockTake"])
      .sort({ flaggedAt: -1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findByIdForCompanyWithDetail(companyId: number, id: number): Promise<StockHoldItem | null> {
    const doc = await this.documents
      .findOne({ _id: id, companyId })
      .populate(["product", "stockTake"])
      .lean()
      .exec();
    return this.toDomain(doc);
  }
}
