import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { ValveRfq } from "./entities/valve-rfq.entity";
import { ValveRfqRepository } from "./valve-rfq.repository";

@Injectable()
export class MongoValveRfqRepository
  extends MongoCrudRepository<ValveRfq>
  implements ValveRfqRepository
{
  constructor(@InjectModel("ValveRfq") model: Model<ValveRfq>) {
    super(model);
  }
}
