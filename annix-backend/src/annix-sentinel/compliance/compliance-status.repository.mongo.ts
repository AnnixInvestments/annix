import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { AnnixSentinelComplianceStatusRepository } from "./compliance-status.repository";
import { AnnixSentinelComplianceStatus } from "./entities/compliance-status.entity";

@Injectable()
export class MongoAnnixSentinelComplianceStatusRepository
  extends MongoCrudRepository<AnnixSentinelComplianceStatus>
  implements AnnixSentinelComplianceStatusRepository
{
  constructor(
    @InjectModel("AnnixSentinelComplianceStatus") model: Model<AnnixSentinelComplianceStatus>,
  ) {
    super(model);
  }

  async findByCompanyIds(companyIds: number[]): Promise<AnnixSentinelComplianceStatus[]> {
    const documents = await this.documents
      .find({ companyId: { $in: companyIds } })
      .lean()
      .exec();
    return this.toDomainList(documents);
  }

  async findWithDueDates(): Promise<AnnixSentinelComplianceStatus[]> {
    const documents = await this.documents
      .find({ nextDueDate: { $ne: null } })
      .lean()
      .exec();
    return this.toDomainList(documents);
  }
}
