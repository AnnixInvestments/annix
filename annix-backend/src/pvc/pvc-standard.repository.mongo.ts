import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { PvcStandard } from "./entities/pvc-standard.entity";
import { PvcStandardRepository } from "./pvc-standard.repository";

@Injectable()
export class MongoPvcStandardRepository
  extends MongoCrudRepository<PvcStandard>
  implements PvcStandardRepository
{
  constructor(@InjectModel("PvcStandard") model: Model<PvcStandard>) {
    super(model);
  }

  async findActive(): Promise<PvcStandard[]> {
    const documents = await this.documents
      .find({ isActive: true })
      .sort({ displayOrder: 1, name: 1 })
      .lean()
      .exec();
    return this.toDomainList(documents);
  }

  async findByCode(code: string): Promise<PvcStandard | null> {
    const document = await this.documents.findOne({ code, isActive: true }).lean().exec();
    return this.toDomain(document);
  }
}
