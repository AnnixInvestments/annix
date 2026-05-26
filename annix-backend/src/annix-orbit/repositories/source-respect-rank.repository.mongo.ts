import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { SourceRespectRank } from "../entities/source-respect-rank.entity";
import { SourceRespectRankRepository } from "./source-respect-rank.repository";

@Injectable()
export class MongoSourceRespectRankRepository
  extends MongoCrudRepository<SourceRespectRank>
  implements SourceRespectRankRepository
{
  constructor(@InjectModel("SourceRespectRank") model: Model<SourceRespectRank>) {
    super(model);
  }
}
