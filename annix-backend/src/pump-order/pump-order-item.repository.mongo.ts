import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import type { DeepPartial } from "../lib/persistence/crud-repository";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { PumpOrderItem } from "./entities/pump-order-item.entity";
import { PumpOrderItemRepository } from "./pump-order-item.repository";

@Injectable()
export class MongoPumpOrderItemRepository
  extends MongoCrudRepository<PumpOrderItem>
  implements PumpOrderItemRepository
{
  constructor(@InjectModel("PumpOrderItem") model: Model<PumpOrderItem>) {
    super(model);
  }

  async deleteByOrderId(orderId: number): Promise<void> {
    await this.documents.deleteMany({ orderId }).exec();
  }

  async saveMany(items: DeepPartial<PumpOrderItem>[]): Promise<PumpOrderItem[]> {
    const saved = await Promise.all(
      items.map(async (item) => {
        const created = await this.create(item);
        return created;
      }),
    );
    return saved;
  }
}
