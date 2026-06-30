import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { Quotation } from "../entities/quotation.entity";
import { QuotationRepository } from "./quotation.repository";

@Injectable()
export class MongoQuotationRepository
  extends MongoCrudRepository<Quotation>
  implements QuotationRepository
{
  constructor(@InjectModel("Quotation") model: Model<Quotation>) {
    super(model);
  }

  build(data: Partial<Quotation>): Quotation {
    return data as Quotation;
  }

  async update(id: number, data: DeepPartial<Quotation>): Promise<Quotation | null> {
    const doc = await this.documents
      .findOneAndUpdate({ _id: id }, { $set: data }, { returnDocument: "after" })
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.documents.deleteOne({ _id: id }).exec();
    return (result.deletedCount ?? 0) > 0;
  }
}
