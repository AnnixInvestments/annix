import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { TankChuteRfq } from "./entities/tank-chute-rfq.entity";
import { TankChuteRfqRepository } from "./tank-chute-rfq.repository";

@Injectable()
export class MongoTankChuteRfqRepository
  extends MongoCrudRepository<TankChuteRfq>
  implements TankChuteRfqRepository
{
  constructor(@InjectModel("TankChuteRfq") model: Model<TankChuteRfq>) {
    super(model);
  }
}
