import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { MozambiqueMine } from "./entities/mozambique-mine.entity";
import { MozambiqueMineRepository } from "./mozambique-mine.repository";

@Injectable()
export class MongoMozambiqueMineRepository
  extends MongoCrudRepository<MozambiqueMine>
  implements MozambiqueMineRepository
{
  constructor(@InjectModel("MozambiqueMine") model: Model<MozambiqueMine>) {
    super(model);
  }
}
