import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { LiningCoatingRule } from "./entities/lining-coating-rule.entity";
import { RiskLevel } from "./entities/slurry-profile.entity";
import { LiningCoatingRuleRepository } from "./lining-coating-rule.repository";

@Injectable()
export class MongoLiningCoatingRuleRepository
  extends MongoCrudRepository<LiningCoatingRule>
  implements LiningCoatingRuleRepository
{
  constructor(@InjectModel("LiningCoatingRule") model: Model<LiningCoatingRule>) {
    super(model);
  }

  async findTopByRisks(
    abrasionLevel: RiskLevel,
    corrosionLevel: RiskLevel,
  ): Promise<LiningCoatingRule | null> {
    const document = await this.documents
      .findOne({ abrasionLevel, corrosionLevel })
      .sort({ priority: -1 })
      .lean()
      .exec();
    return this.toDomain(document);
  }

  async findAllOrdered(): Promise<LiningCoatingRule[]> {
    const documents = await this.documents
      .find()
      .sort({ abrasionLevel: 1, corrosionLevel: 1 })
      .lean()
      .exec();
    return this.toDomainList(documents);
  }
}
