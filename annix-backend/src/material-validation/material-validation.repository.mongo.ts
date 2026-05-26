import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { MaterialLimit } from "./entities/material-limit.entity";
import { MaterialValidationRepository } from "./material-validation.repository";

@Injectable()
export class MongoMaterialValidationRepository
  extends MongoCrudRepository<MaterialLimit>
  implements MaterialValidationRepository
{
  constructor(@InjectModel("MaterialLimit") model: Model<MaterialLimit>) {
    super(model);
  }

  async findAllLimits(): Promise<MaterialLimit[]> {
    const docs = await this.documents.find().lean().exec();
    return this.toDomainList(docs);
  }

  async findBySpecId(steelSpecificationId: number): Promise<MaterialLimit | null> {
    const doc = await this.documents
      .findOne({ steel_specification_id: steelSpecificationId })
      .lean()
      .exec();
    return this.toDomain(doc);
  }
}
