import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { type DeepPartial } from "../../lib/persistence/crud-repository";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { ReconciliationItem } from "../entities/reconciliation-item.entity";
import { ReconciliationItemRepository } from "./reconciliation-item.repository";

@Injectable()
export class MongoReconciliationItemRepository
  extends MongoCrudRepository<ReconciliationItem>
  implements ReconciliationItemRepository
{
  constructor(
    @InjectModel("ReconciliationItem")
    model: Model<ReconciliationItem>,
  ) {
    super(model);
  }

  async findForJobCardOrdered(companyId: number, jobCardId: number): Promise<ReconciliationItem[]> {
    const docs = await this.documents
      .find({ companyId, jobCardId })
      .sort({ sortOrder: 1, createdAt: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findForJobCard(companyId: number, jobCardId: number): Promise<ReconciliationItem[]> {
    const docs = await this.documents.find({ companyId, jobCardId }).lean().exec();
    return this.toDomainList(docs);
  }

  async findOneForCompany(id: number, companyId: number): Promise<ReconciliationItem | null> {
    const doc = await this.documents.findOne({ _id: id, companyId }).lean().exec();
    return this.toDomain(doc);
  }

  async maxSortOrder(companyId: number, jobCardId: number): Promise<number> {
    const top = await this.documents
      .findOne({ companyId, jobCardId })
      .sort({ sortOrder: -1 })
      .lean()
      .exec();
    const row = top as Record<string, unknown> | null;
    return row ? ((row.sortOrder as number) ?? -1) : -1;
  }

  buildMany(rows: DeepPartial<ReconciliationItem>[]): ReconciliationItem[] {
    return rows as ReconciliationItem[];
  }

  async saveMany(entities: ReconciliationItem[]): Promise<ReconciliationItem[]> {
    return Promise.all(entities.map((entity) => this.save(entity)));
  }
}
