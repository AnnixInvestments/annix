import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { IssuanceSession } from "../entities/issuance-session.entity";
import { IssuanceSessionRepository } from "./issuance-session.repository";

@Injectable()
export class MongoIssuanceSessionRepository
  extends MongoCrudRepository<IssuanceSession>
  implements IssuanceSessionRepository
{
  constructor(@InjectModel("IssuanceSession") model: Model<IssuanceSession>) {
    super(model);
  }
}
