import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { RubberOrder, RubberOrderStatus } from "../entities/rubber-order.entity";
import { RubberOrderRepository } from "./rubber-order.repository";

const ORDER_RELATIONS = ["company", "items"];

@Injectable()
export class MongoRubberOrderRepository
  extends MongoCrudRepository<RubberOrder>
  implements RubberOrderRepository
{
  constructor(@InjectModel("RubberOrder") model: Model<RubberOrder>) {
    super(model);
  }

  build(data: Partial<RubberOrder>): RubberOrder {
    return data as RubberOrder;
  }

  async deleteById(id: number): Promise<boolean> {
    const result = await this.documents.deleteOne({ _id: id }).exec();
    return result.deletedCount > 0;
  }

  async findFilteredWithRelations(status?: RubberOrderStatus): Promise<RubberOrder[]> {
    const filter: Record<string, unknown> = {};
    if (status !== undefined) {
      filter.status = status;
    }
    const docs = await this.documents
      .find(filter)
      .populate(ORDER_RELATIONS)
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findOneByIdWithRelations(id: number): Promise<RubberOrder | null> {
    const doc = await this.documents.findById(id).populate(ORDER_RELATIONS).lean().exec();
    return this.toDomain(doc);
  }

  async findLatest(): Promise<RubberOrder | null> {
    const doc = await this.documents.findOne().sort({ _id: -1 }).lean().exec();
    return this.toDomain(doc);
  }
}
