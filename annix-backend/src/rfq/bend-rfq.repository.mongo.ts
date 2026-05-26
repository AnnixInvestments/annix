import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { BendRfqRepository } from "./bend-rfq.repository";
import { BendRfq } from "./entities/bend-rfq.entity";

@Injectable()
export class MongoBendRfqRepository
  extends MongoCrudRepository<BendRfq>
  implements BendRfqRepository
{
  constructor(@InjectModel("BendRfq") model: Model<BendRfq>) {
    super(model);
  }
}
