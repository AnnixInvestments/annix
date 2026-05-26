import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { PaintProduct } from "../entities/paint-product.entity";
import { PaintProductRepository } from "./paint-product.repository";

@Injectable()
export class MongoPaintProductRepository
  extends MongoCrudRepository<PaintProduct>
  implements PaintProductRepository
{
  constructor(@InjectModel("PaintProduct") model: Model<PaintProduct>) {
    super(model);
  }

  build(data: DeepPartial<PaintProduct>): PaintProduct {
    return data as PaintProduct;
  }

  async findByProductId(productId: number): Promise<PaintProduct | null> {
    const doc = await this.documents.findOne({ productId }).lean().exec();
    return this.toDomain(doc);
  }
}
