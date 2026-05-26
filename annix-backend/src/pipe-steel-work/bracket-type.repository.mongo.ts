import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { BracketTypeRepository } from "./bracket-type.repository";
import { BracketTypeEntity } from "./entities/bracket-type.entity";

@Injectable()
export class MongoBracketTypeRepository
  extends MongoCrudRepository<BracketTypeEntity>
  implements BracketTypeRepository
{
  constructor(@InjectModel("BracketTypeEntity") model: Model<BracketTypeEntity>) {
    super(model);
  }
}
