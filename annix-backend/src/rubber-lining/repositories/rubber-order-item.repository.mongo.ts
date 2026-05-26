import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { RubberOrderItem } from "../entities/rubber-order-item.entity";
import { RubberOrderItemRepository } from "./rubber-order-item.repository";

@Injectable()
export class MongoRubberOrderItemRepository
  extends MongoCrudRepository<RubberOrderItem>
  implements RubberOrderItemRepository
{
  constructor(@InjectModel("RubberOrderItem") model: Model<RubberOrderItem>) {
    super(model);
  }

  build(data: Partial<RubberOrderItem>): RubberOrderItem {
    return data as RubberOrderItem;
  }

  saveMany(entities: RubberOrderItem[]): Promise<RubberOrderItem[]> {
    return Promise.all(entities.map((entity) => this.create(entity)));
  }

  async deleteByOrderId(orderId: number): Promise<void> {
    await this.documents.deleteMany({ orderId }).exec();
  }
}
