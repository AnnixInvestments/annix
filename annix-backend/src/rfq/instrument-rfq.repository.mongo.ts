import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { InstrumentRfq } from "./entities/instrument-rfq.entity";
import { InstrumentRfqRepository } from "./instrument-rfq.repository";

@Injectable()
export class MongoInstrumentRfqRepository
  extends MongoCrudRepository<InstrumentRfq>
  implements InstrumentRfqRepository
{
  constructor(@InjectModel("InstrumentRfq") model: Model<InstrumentRfq>) {
    super(model);
  }
}
