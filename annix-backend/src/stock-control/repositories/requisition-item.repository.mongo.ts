import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { type DeepPartial } from "../../lib/persistence/crud-repository";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { RequisitionItem } from "../entities/requisition-item.entity";
import { RequisitionItemRepository } from "./requisition-item.repository";

@Injectable()
export class MongoRequisitionItemRepository
  extends MongoCrudRepository<RequisitionItem>
  implements RequisitionItemRepository
{
  constructor(@InjectModel("RequisitionItem") model: Model<RequisitionItem>) {
    super(model);
  }

  async findOneForCompanyWithStockItem(
    id: number,
    companyId: number,
  ): Promise<RequisitionItem | null> {
    const doc = await this.documents
      .findOne({ _id: id, companyId })
      .populate("stockItem")
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findOneForRequisition(
    id: number,
    requisitionId: number,
    companyId: number,
  ): Promise<RequisitionItem | null> {
    const doc = await this.documents.findOne({ _id: id, requisitionId, companyId }).lean().exec();
    return this.toDomain(doc);
  }

  buildMany(rows: DeepPartial<RequisitionItem>[]): RequisitionItem[] {
    return rows as RequisitionItem[];
  }

  async saveMany(entities: RequisitionItem[]): Promise<RequisitionItem[]> {
    return Promise.all(entities.map((entity) => this.save(entity)));
  }
}
