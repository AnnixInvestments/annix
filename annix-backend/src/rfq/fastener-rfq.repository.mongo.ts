import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { FastenerRfq } from "./entities/fastener-rfq.entity";
import { FastenerRfqRepository } from "./fastener-rfq.repository";

@Injectable()
export class MongoFastenerRfqRepository
  extends MongoCrudRepository<FastenerRfq>
  implements FastenerRfqRepository
{
  constructor(@InjectModel("FastenerRfq") model: Model<FastenerRfq>) {
    super(model);
  }
}
