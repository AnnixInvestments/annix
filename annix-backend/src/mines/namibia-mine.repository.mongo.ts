import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { NamibiaMine } from "./entities/namibia-mine.entity";
import { NamibiaMineRepository } from "./namibia-mine.repository";

@Injectable()
export class MongoNamibiaMineRepository
  extends MongoCrudRepository<NamibiaMine>
  implements NamibiaMineRepository
{
  constructor(@InjectModel("NamibiaMine") model: Model<NamibiaMine>) {
    super(model);
  }
}
