import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { AngleRangeRepository } from "./angle-range.repository";
import { AngleRange } from "./entities/angle-range.entity";

@Injectable()
export class MongoAngleRangeRepository
  extends MongoCrudRepository<AngleRange>
  implements AngleRangeRepository
{
  constructor(@InjectModel("AngleRange") model: Model<AngleRange>) {
    super(model);
  }
}
