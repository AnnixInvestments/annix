import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { ZambiaMine } from "./entities/zambia-mine.entity";
import { ZambiaMineRepository } from "./zambia-mine.repository";

@Injectable()
export class MongoZambiaMineRepository
  extends MongoCrudRepository<ZambiaMine>
  implements ZambiaMineRepository
{
  constructor(@InjectModel("ZambiaMine") model: Model<ZambiaMine>) {
    super(model);
  }
}
