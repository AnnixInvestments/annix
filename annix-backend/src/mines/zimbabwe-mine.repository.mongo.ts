import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { ZimbabweMine } from "./entities/zimbabwe-mine.entity";
import { ZimbabweMineRepository } from "./zimbabwe-mine.repository";

@Injectable()
export class MongoZimbabweMineRepository
  extends MongoCrudRepository<ZimbabweMine>
  implements ZimbabweMineRepository
{
  constructor(@InjectModel("ZimbabweMine") model: Model<ZimbabweMine>) {
    super(model);
  }
}
