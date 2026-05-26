import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { FittingVariant } from "./entities/fitting-variant.entity";
import { FittingVariantRepository } from "./fitting-variant.repository";

@Injectable()
export class MongoFittingVariantRepository
  extends MongoCrudRepository<FittingVariant>
  implements FittingVariantRepository
{
  constructor(@InjectModel("FittingVariant") model: Model<FittingVariant>) {
    super(model);
  }
}
