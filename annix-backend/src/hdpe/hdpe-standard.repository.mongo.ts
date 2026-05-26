import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { HdpeStandard } from "./entities/hdpe-standard.entity";
import { HdpeStandardRepository } from "./hdpe-standard.repository";

@Injectable()
export class MongoHdpeStandardRepository
  extends MongoCrudRepository<HdpeStandard>
  implements HdpeStandardRepository
{
  constructor(@InjectModel("HdpeStandard") model: Model<HdpeStandard>) {
    super(model);
  }

  async findByCode(code: string): Promise<HdpeStandard | null> {
    const document = await this.documents.findOne({ code, isActive: true }).lean().exec();
    return this.toDomain(document);
  }

  async findActiveOrderedByDisplayOrder(): Promise<HdpeStandard[]> {
    const documents = await this.documents
      .find({ isActive: true })
      .sort({ displayOrder: 1, name: 1 })
      .lean()
      .exec();
    return this.toDomainList(documents);
  }
}
