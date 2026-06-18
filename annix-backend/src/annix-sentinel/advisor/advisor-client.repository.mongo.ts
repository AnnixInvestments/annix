import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { AnnixSentinelAdvisorClientRepository } from "./advisor-client.repository";
import { AnnixSentinelAdvisorClient } from "./entities/advisor-client.entity";

@Injectable()
export class MongoAnnixSentinelAdvisorClientRepository
  extends MongoCrudRepository<AnnixSentinelAdvisorClient>
  implements AnnixSentinelAdvisorClientRepository
{
  constructor(@InjectModel("AnnixSentinelAdvisorClient") model: Model<AnnixSentinelAdvisorClient>) {
    super(model);
  }
}
