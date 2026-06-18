import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { AnnixSentinelProfileRepository } from "./annix-sentinel-profile.repository";
import { AnnixSentinelProfile } from "./entities/annix-sentinel-profile.entity";

@Injectable()
export class MongoAnnixSentinelProfileRepository
  extends MongoCrudRepository<AnnixSentinelProfile>
  implements AnnixSentinelProfileRepository
{
  constructor(@InjectModel("AnnixSentinelProfile") model: Model<AnnixSentinelProfile>) {
    super(model);
  }

  async findOneByUserId(userId: number): Promise<AnnixSentinelProfile | null> {
    const document = await this.documents.findOne({ userId }).lean().exec();
    return this.toDomain(document);
  }

  async findByCompanyIds(companyIds: number[]): Promise<AnnixSentinelProfile[]> {
    const documents = await this.documents
      .find({ companyId: { $in: companyIds } })
      .lean()
      .exec();
    return this.toDomainList(documents);
  }
}
