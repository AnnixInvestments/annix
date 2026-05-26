import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { FlangeStandard } from "./entities/flange-standard.entity";
import { FlangeStandardRepository } from "./flange-standard.repository";

@Injectable()
export class MongoFlangeStandardRepository
  extends MongoCrudRepository<FlangeStandard>
  implements FlangeStandardRepository
{
  constructor(@InjectModel("FlangeStandard") model: Model<FlangeStandard>) {
    super(model);
  }

  async findByIds(ids: number[]): Promise<FlangeStandard[]> {
    if (ids.length === 0) return [];
    const documents = await this.documents
      .find({ _id: { $in: ids } })
      .lean()
      .exec();
    return this.toDomainList(documents);
  }
}
