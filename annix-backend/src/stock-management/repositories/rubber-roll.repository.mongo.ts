import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { RubberRoll } from "../entities/rubber-roll.entity";
import { RubberRollRepository } from "./rubber-roll.repository";

@Injectable()
export class MongoRubberRollRepository
  extends MongoCrudRepository<RubberRoll>
  implements RubberRollRepository
{
  constructor(@InjectModel("RubberRoll") model: Model<RubberRoll>) {
    super(model);
  }

  build(data: DeepPartial<RubberRoll>): RubberRoll {
    return data as RubberRoll;
  }

  async findByProductId(productId: number): Promise<RubberRoll | null> {
    const doc = await this.documents.findOne({ productId }).lean().exec();
    return this.toDomain(doc);
  }
}
