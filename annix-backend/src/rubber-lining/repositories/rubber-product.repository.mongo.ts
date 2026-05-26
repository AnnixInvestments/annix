import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { RubberProduct } from "../entities/rubber-product.entity";
import { RubberProductRepository } from "./rubber-product.repository";

@Injectable()
export class MongoRubberProductRepository
  extends MongoCrudRepository<RubberProduct>
  implements RubberProductRepository
{
  constructor(@InjectModel("RubberProduct") model: Model<RubberProduct>) {
    super(model);
  }

  build(data: Partial<RubberProduct>): RubberProduct {
    return data as RubberProduct;
  }

  async deleteById(id: number): Promise<boolean> {
    const result = await this.documents.deleteOne({ _id: id }).exec();
    return result.deletedCount > 0;
  }

  async findAllOrderedByTitle(): Promise<RubberProduct[]> {
    const docs = await this.documents.find().sort({ title: 1 }).lean().exec();
    return this.toDomainList(docs);
  }

  async findOneByCompoundFirebaseUid(compoundFirebaseUid: string): Promise<RubberProduct | null> {
    const doc = await this.documents.findOne({ compoundFirebaseUid }).lean().exec();
    return this.toDomain(doc);
  }
}
