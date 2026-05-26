import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { BotswanaMineRepository } from "./botswana-mine.repository";
import { BotswanaMine } from "./entities/botswana-mine.entity";

@Injectable()
export class MongoBotswanaMineRepository
  extends MongoCrudRepository<BotswanaMine>
  implements BotswanaMineRepository
{
  constructor(@InjectModel("BotswanaMine") model: Model<BotswanaMine>) {
    super(model);
  }
}
