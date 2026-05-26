import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import {
  RubberCompoundOrder,
  RubberCompoundOrderStatus,
} from "../entities/rubber-compound-order.entity";
import { RubberCompoundOrderRepository } from "./rubber-compound-order.repository";

@Injectable()
export class MongoRubberCompoundOrderRepository
  extends MongoCrudRepository<RubberCompoundOrder>
  implements RubberCompoundOrderRepository
{
  constructor(@InjectModel("RubberCompoundOrder") model: Model<RubberCompoundOrder>) {
    super(model);
  }

  build(data: Partial<RubberCompoundOrder>): RubberCompoundOrder {
    return data as RubberCompoundOrder;
  }

  async findByStatusWithRelations(
    status?: RubberCompoundOrderStatus,
  ): Promise<RubberCompoundOrder[]> {
    const filter = status !== undefined ? { status } : {};
    const docs = await this.documents.find(filter).sort({ createdAt: -1 }).lean().exec();
    return this.toDomainList(docs);
  }

  async findOneByIdWithRelations(id: number): Promise<RubberCompoundOrder | null> {
    const doc = await this.documents.findById(id).lean().exec();
    return this.toDomain(doc);
  }

  async findLastById(): Promise<RubberCompoundOrder | null> {
    const doc = await this.documents.findOne().sort({ _id: -1 }).lean().exec();
    return this.toDomain(doc);
  }

  async findOneActiveForStock(compoundStockId: number): Promise<RubberCompoundOrder | null> {
    const doc = await this.documents
      .findOne({
        compoundStockId,
        status: {
          $in: [
            RubberCompoundOrderStatus.PENDING,
            RubberCompoundOrderStatus.APPROVED,
            RubberCompoundOrderStatus.ORDERED,
          ],
        },
      })
      .lean()
      .exec();
    return this.toDomain(doc);
  }
}
