import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { FlangePressureClass } from "./entities/flange-pressure-class.entity";
import { FlangePressureClassRepository } from "./flange-pressure-class.repository";

@Injectable()
export class MongoFlangePressureClassRepository
  extends MongoCrudRepository<FlangePressureClass>
  implements FlangePressureClassRepository
{
  constructor(@InjectModel("FlangePressureClass") model: Model<FlangePressureClass>) {
    super(model);
  }

  async findByStandardId(standardId: number): Promise<FlangePressureClass[]> {
    return this.toDomainList(await this.documents.find({ standardId }).lean().exec());
  }

  async findByIds(ids: number[]): Promise<FlangePressureClass[]> {
    if (ids.length === 0) return [];
    const documents = await this.documents
      .find({ _id: { $in: ids } })
      .lean()
      .exec();
    return this.toDomainList(documents);
  }
}
