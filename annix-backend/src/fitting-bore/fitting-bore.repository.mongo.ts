import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { type DeepPartial } from "../lib/persistence/crud-repository";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { FittingBore } from "./entities/fitting-bore.entity";
import { FittingBoreRepository } from "./fitting-bore.repository";

@Injectable()
export class MongoFittingBoreRepository
  extends MongoCrudRepository<FittingBore>
  implements FittingBoreRepository
{
  constructor(@InjectModel("FittingBore") model: Model<FittingBore>) {
    super(model);
  }

  instantiate(data: DeepPartial<FittingBore>): FittingBore {
    return data as FittingBore;
  }
}
