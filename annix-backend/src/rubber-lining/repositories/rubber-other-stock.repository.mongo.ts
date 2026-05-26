import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { RubberOtherStock } from "../entities/rubber-other-stock.entity";
import { RubberOtherStockRepository } from "./rubber-other-stock.repository";

@Injectable()
export class MongoRubberOtherStockRepository
  extends MongoCrudRepository<RubberOtherStock>
  implements RubberOtherStockRepository
{
  constructor(@InjectModel("RubberOtherStock") model: Model<RubberOtherStock>) {
    super(model);
  }

  build(data: Partial<RubberOtherStock>): RubberOtherStock {
    return data as RubberOtherStock;
  }

  async findAllWithLocation(includeInactive: boolean): Promise<RubberOtherStock[]> {
    const filter = includeInactive ? {} : { isActive: true };
    const docs = await this.documents
      .find(filter)
      .populate("stockLocation")
      .sort({ itemName: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findLowStockWithLocation(): Promise<RubberOtherStock[]> {
    const docs = await this.documents
      .find({ isActive: true, $expr: { $lte: ["$quantity", "$reorderPoint"] } })
      .populate("stockLocation")
      .sort({ itemName: 1 })
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async findByIdWithLocation(id: number): Promise<RubberOtherStock | null> {
    const doc = await this.documents.findById(id).populate("stockLocation").lean().exec();
    return this.toDomain(doc);
  }

  async findOneByItemCode(itemCode: string): Promise<RubberOtherStock | null> {
    const doc = await this.documents.findOne({ itemCode }).lean().exec();
    return this.toDomain(doc);
  }
}
