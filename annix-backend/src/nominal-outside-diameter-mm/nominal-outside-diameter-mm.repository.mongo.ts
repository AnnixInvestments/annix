import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { NominalOutsideDiameterMm } from "./entities/nominal-outside-diameter-mm.entity";
import { NominalOutsideDiameterMmRepository } from "./nominal-outside-diameter-mm.repository";

@Injectable()
export class MongoNominalOutsideDiameterMmRepository
  extends MongoCrudRepository<NominalOutsideDiameterMm>
  implements NominalOutsideDiameterMmRepository
{
  constructor(@InjectModel("NominalOutsideDiameterMm") model: Model<NominalOutsideDiameterMm>) {
    super(model);
  }
}
