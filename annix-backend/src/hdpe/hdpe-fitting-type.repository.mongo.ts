import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { HdpeFittingType } from "./entities/hdpe-fitting-type.entity";
import { HdpeFittingTypeRepository } from "./hdpe-fitting-type.repository";

@Injectable()
export class MongoHdpeFittingTypeRepository
  extends MongoCrudRepository<HdpeFittingType>
  implements HdpeFittingTypeRepository
{
  constructor(@InjectModel("HdpeFittingType") model: Model<HdpeFittingType>) {
    super(model);
  }

  async findByCode(code: string): Promise<HdpeFittingType | null> {
    const document = await this.documents.findOne({ code, isActive: true }).lean().exec();
    return this.toDomain(document);
  }

  async findActiveOrderedByDisplayOrder(): Promise<HdpeFittingType[]> {
    const documents = await this.documents
      .find({ isActive: true })
      .sort({ displayOrder: 1, name: 1 })
      .lean()
      .exec();
    return this.toDomainList(documents);
  }
}
