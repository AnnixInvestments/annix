import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { AnnixSentinelComplianceRequirementRepository } from "./compliance-requirement.repository";
import { AnnixSentinelComplianceRequirement } from "./entities/compliance-requirement.entity";

@Injectable()
export class MongoAnnixSentinelComplianceRequirementRepository
  extends MongoCrudRepository<AnnixSentinelComplianceRequirement>
  implements AnnixSentinelComplianceRequirementRepository
{
  constructor(
    @InjectModel("AnnixSentinelComplianceRequirement")
    model: Model<AnnixSentinelComplianceRequirement>,
  ) {
    super(model);
  }

  async findByIds(ids: number[]): Promise<AnnixSentinelComplianceRequirement[]> {
    const documents = await this.documents
      .find({ _id: { $in: ids } })
      .lean()
      .exec();
    return this.toDomainList(documents);
  }
}
