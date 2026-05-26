import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { SolutionProduct } from "../entities/solution-product.entity";
import { SolutionProductRepository } from "./solution-product.repository";

@Injectable()
export class MongoSolutionProductRepository
  extends MongoCrudRepository<SolutionProduct>
  implements SolutionProductRepository
{
  constructor(@InjectModel("SolutionProduct") model: Model<SolutionProduct>) {
    super(model);
  }

  build(data: DeepPartial<SolutionProduct>): SolutionProduct {
    return data as SolutionProduct;
  }

  async findByProductId(productId: number): Promise<SolutionProduct | null> {
    const doc = await this.documents.findOne({ productId }).lean().exec();
    return this.toDomain(doc);
  }
}
