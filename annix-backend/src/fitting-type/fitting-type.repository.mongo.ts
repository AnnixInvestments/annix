import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { FittingType } from "./entities/fitting-type.entity";
import { FittingTypeRepository } from "./fitting-type.repository";

@Injectable()
export class MongoFittingTypeRepository
  extends MongoCrudRepository<FittingType>
  implements FittingTypeRepository
{
  constructor(@InjectModel("FittingType") model: Model<FittingType>) {
    super(model);
  }
}
