import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { ConsumableProduct } from "../entities/consumable-product.entity";
import { ConsumableProductRepository } from "./consumable-product.repository";

@Injectable()
export class MongoConsumableProductRepository
  extends MongoCrudRepository<ConsumableProduct>
  implements ConsumableProductRepository
{
  constructor(@InjectModel("ConsumableProduct") model: Model<ConsumableProduct>) {
    super(model);
  }

  build(data: DeepPartial<ConsumableProduct>): ConsumableProduct {
    return data as ConsumableProduct;
  }

  async findByProductId(productId: number): Promise<ConsumableProduct | null> {
    const doc = await this.documents.findOne({ productId }).lean().exec();
    return this.toDomain(doc);
  }
}
