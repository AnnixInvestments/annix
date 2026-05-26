import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { RubberCompoundStock } from "../entities/rubber-compound-stock.entity";
import { RubberCompoundStockRepository } from "./rubber-compound-stock.repository";

@Injectable()
export class MongoRubberCompoundStockRepository
  extends MongoCrudRepository<RubberCompoundStock>
  implements RubberCompoundStockRepository
{
  constructor(@InjectModel("RubberCompoundStock") model: Model<RubberCompoundStock>) {
    super(model);
  }

  build(data: Partial<RubberCompoundStock>): RubberCompoundStock {
    return data as RubberCompoundStock;
  }

  async findAllWithCodingOrderedById(): Promise<RubberCompoundStock[]> {
    const docs = await this.documents.find().sort({ _id: 1 }).lean().exec();
    return this.toDomainList(docs);
  }

  async findOneByIdWithCoding(id: number): Promise<RubberCompoundStock | null> {
    const doc = await this.documents.findById(id).lean().exec();
    return this.toDomain(doc);
  }

  async findOneByCompoundCodingId(compoundCodingId: number): Promise<RubberCompoundStock | null> {
    const doc = await this.documents.findOne({ compoundCodingId }).lean().exec();
    return this.toDomain(doc);
  }

  async findOneByCompoundCodingIdWithCoding(
    compoundCodingId: number,
  ): Promise<RubberCompoundStock | null> {
    const doc = await this.documents.findOne({ compoundCodingId }).lean().exec();
    return this.toDomain(doc);
  }

  async findLowStockWithCodingOrdered(): Promise<RubberCompoundStock[]> {
    const docs = await this.documents
      .find({ $expr: { $lt: ["$quantityKg", "$reorderPointKg"] } })
      .sort({ quantityKg: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findLowStockBelowMinWithCoding(): Promise<RubberCompoundStock[]> {
    const docs = await this.documents
      .find({
        minStockLevelKg: { $gt: 0 },
        $expr: { $lt: ["$quantityKg", "$minStockLevelKg"] },
      })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async deleteById(id: number): Promise<boolean> {
    const result = await this.documents.deleteOne({ _id: id }).exec();
    return result.deletedCount > 0;
  }
}
