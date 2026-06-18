import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { AnnixSentinelCompanyDetailsRepository } from "./annix-sentinel-company-details.repository";
import { AnnixSentinelCompanyDetails } from "./entities/annix-sentinel-company-details.entity";

@Injectable()
export class MongoAnnixSentinelCompanyDetailsRepository
  extends MongoCrudRepository<AnnixSentinelCompanyDetails>
  implements AnnixSentinelCompanyDetailsRepository
{
  constructor(
    @InjectModel("AnnixSentinelCompanyDetails") model: Model<AnnixSentinelCompanyDetails>,
  ) {
    super(model);
  }

  async findOneByCompanyId(companyId: number): Promise<AnnixSentinelCompanyDetails | null> {
    const document = await this.documents.findOne({ companyId }).lean().exec();
    return this.toDomain(document);
  }

  countCancelledCreatedBefore(cutoff: Date): Promise<number> {
    return this.documents
      .countDocuments({ createdAt: { $lt: cutoff }, subscriptionStatus: "cancelled" })
      .exec();
  }
}
