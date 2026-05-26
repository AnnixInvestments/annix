import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { Fitting } from "./entities/fitting.entity";
import { FittingRepository } from "./fitting.repository";

@Injectable()
export class MongoFittingRepository
  extends MongoCrudRepository<Fitting>
  implements FittingRepository
{
  constructor(@InjectModel("Fitting") model: Model<Fitting>) {
    super(model);
  }
}
