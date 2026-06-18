import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { AnnixSentinelApiKeyRepository } from "./api-key.repository";
import { AnnixSentinelApiKey } from "./entities/api-key.entity";

@Injectable()
export class MongoAnnixSentinelApiKeyRepository
  extends MongoCrudRepository<AnnixSentinelApiKey>
  implements AnnixSentinelApiKeyRepository
{
  constructor(@InjectModel("AnnixSentinelApiKey") model: Model<AnnixSentinelApiKey>) {
    super(model);
  }

  async findActiveByKeyHash(keyHash: string): Promise<AnnixSentinelApiKey | null> {
    const document = await this.documents.findOne({ keyHash, active: true }).lean().exec();
    return this.toDomain(document);
  }

  async findByIdAndCompany(id: number, companyId: number): Promise<AnnixSentinelApiKey | null> {
    const document = await this.documents.findOne({ _id: id, companyId }).lean().exec();
    return this.toDomain(document);
  }

  async findByCompanyNewestFirst(companyId: number): Promise<AnnixSentinelApiKey[]> {
    const documents = await this.documents
      .find({ companyId })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return this.toDomainList(documents);
  }
}
