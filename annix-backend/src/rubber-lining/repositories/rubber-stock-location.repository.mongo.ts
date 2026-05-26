import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { RubberStockLocation } from "../entities/rubber-stock-location.entity";
import { RubberStockLocationRepository } from "./rubber-stock-location.repository";

@Injectable()
export class MongoRubberStockLocationRepository
  extends MongoCrudRepository<RubberStockLocation>
  implements RubberStockLocationRepository
{
  constructor(@InjectModel("RubberStockLocation") model: Model<RubberStockLocation>) {
    super(model);
  }

  build(data: Partial<RubberStockLocation>): RubberStockLocation {
    return data as RubberStockLocation;
  }

  async findAllOrdered(includeInactive: boolean): Promise<RubberStockLocation[]> {
    const filter = includeInactive ? {} : { active: true };
    const docs = await this.documents.find(filter).sort({ displayOrder: 1, name: 1 }).lean().exec();
    return this.toDomainList(docs);
  }
}
