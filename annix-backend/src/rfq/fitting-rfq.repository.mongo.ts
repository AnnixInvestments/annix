import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { FittingRfq } from "./entities/fitting-rfq.entity";
import { FittingRfqRepository } from "./fitting-rfq.repository";

@Injectable()
export class MongoFittingRfqRepository
  extends MongoCrudRepository<FittingRfq>
  implements FittingRfqRepository
{
  constructor(@InjectModel("FittingRfq") model: Model<FittingRfq>) {
    super(model);
  }
}
