import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { PumpRfq } from "./entities/pump-rfq.entity";
import { PumpRfqRepository } from "./pump-rfq.repository";

@Injectable()
export class MongoPumpRfqRepository
  extends MongoCrudRepository<PumpRfq>
  implements PumpRfqRepository
{
  constructor(@InjectModel("PumpRfq") model: Model<PumpRfq>) {
    super(model);
  }
}
