import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { AnnixSentinelChecklistProgressRepository } from "./checklist-progress.repository";
import { AnnixSentinelChecklistProgress } from "./entities/checklist-progress.entity";

@Injectable()
export class MongoAnnixSentinelChecklistProgressRepository
  extends MongoCrudRepository<AnnixSentinelChecklistProgress>
  implements AnnixSentinelChecklistProgressRepository
{
  constructor(
    @InjectModel("AnnixSentinelChecklistProgress")
    model: Model<AnnixSentinelChecklistProgress>,
  ) {
    super(model);
  }

  async findByCompanyAndRequirementIds(
    companyId: number,
    requirementIds: number[],
  ): Promise<AnnixSentinelChecklistProgress[]> {
    const documents = await this.documents
      .find({ companyId, requirementId: { $in: requirementIds } })
      .lean()
      .exec();
    return this.toDomainList(documents);
  }
}
