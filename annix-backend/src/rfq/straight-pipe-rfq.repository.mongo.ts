import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { StraightPipeRfq } from "./entities/straight-pipe-rfq.entity";
import { StraightPipeRfqRepository } from "./straight-pipe-rfq.repository";

@Injectable()
export class MongoStraightPipeRfqRepository
  extends MongoCrudRepository<StraightPipeRfq>
  implements StraightPipeRfqRepository
{
  constructor(@InjectModel("StraightPipeRfq") model: Model<StraightPipeRfq>) {
    super(model);
  }
}
