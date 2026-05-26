import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { PvcFittingType } from "./entities/pvc-fitting-type.entity";
import { PvcFittingTypeRepository } from "./pvc-fitting-type.repository";

@Injectable()
export class MongoPvcFittingTypeRepository
  extends MongoCrudRepository<PvcFittingType>
  implements PvcFittingTypeRepository
{
  constructor(@InjectModel("PvcFittingType") model: Model<PvcFittingType>) {
    super(model);
  }

  async findActive(): Promise<PvcFittingType[]> {
    const documents = await this.documents
      .find({ isActive: true })
      .sort({ displayOrder: 1, name: 1 })
      .lean()
      .exec();
    return this.toDomainList(documents);
  }

  async findByCode(code: string): Promise<PvcFittingType | null> {
    const document = await this.documents.findOne({ code, isActive: true }).lean().exec();
    return this.toDomain(document);
  }
}
