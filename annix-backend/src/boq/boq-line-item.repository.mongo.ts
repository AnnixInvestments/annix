import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { BoqLineItemRepository } from "./boq-line-item.repository";
import { BoqLineItem } from "./entities/boq-line-item.entity";

@Injectable()
export class MongoBoqLineItemRepository
  extends MongoCrudRepository<BoqLineItem>
  implements BoqLineItemRepository
{
  constructor(@InjectModel("BoqLineItem") model: Model<BoqLineItem>) {
    super(model);
  }

  async maxLineNumber(boqId: number): Promise<number> {
    const result = await this.documents
      .findOne({ boqId })
      .sort({ lineNumber: -1 })
      .select("lineNumber")
      .lean()
      .exec();
    const doc = result as { lineNumber?: number } | null;
    return doc?.lineNumber ?? 0;
  }

  async findByBoq(boqId: number): Promise<BoqLineItem[]> {
    const docs = await this.documents.find({ boqId }).sort({ lineNumber: 1 }).lean().exec();
    return this.toDomainList(docs);
  }

  async findOneByBoq(lineItemId: number, boqId: number): Promise<BoqLineItem | null> {
    const doc = await this.documents.findOne({ _id: lineItemId, boqId }).lean().exec();
    return this.toDomain(doc);
  }

  async reorderByIds(ids: number[]): Promise<void> {
    await Promise.all(
      ids.map((id, i) =>
        this.documents.updateOne({ _id: id }, { $set: { lineNumber: i + 1 } }).exec(),
      ),
    );
  }
}
