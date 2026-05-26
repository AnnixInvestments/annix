import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { RfqItem } from "./entities/rfq-item.entity";
import { RfqItemRepository } from "./rfq-item.repository";

@Injectable()
export class MongoRfqItemRepository
  extends MongoCrudRepository<RfqItem>
  implements RfqItemRepository
{
  constructor(@InjectModel("RfqItem") model: Model<RfqItem>) {
    super(model);
  }

  countByRfqId(rfqId: number): Promise<number> {
    return this.documents.countDocuments({ rfqId }).exec();
  }

  async deleteByRfqId(rfqId: number): Promise<void> {
    await this.documents.deleteMany({ rfqId }).exec();
  }

  async findByRfqIdOrderedByLineNumber(rfqId: number): Promise<RfqItem[]> {
    const documents = await this.documents.find({ rfqId }).sort({ lineNumber: 1 }).lean().exec();
    return this.toDomainList(documents);
  }

  async findByRfqIdWithRelationsOrderedByLineNumber(
    rfqId: number,
    relations: string[],
  ): Promise<RfqItem[]> {
    const documents = await this.documents
      .find({ rfqId })
      .populate(relations)
      .sort({ lineNumber: 1 })
      .lean()
      .exec();
    return this.toDomainList(documents);
  }
}
