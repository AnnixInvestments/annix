import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../../lib/persistence/mongo-crud-repository";
import { AnnixSentinelSageConnection } from "./sage-connection.entity";
import { AnnixSentinelSageConnectionRepository } from "./sage-connection.repository";

@Injectable()
export class MongoAnnixSentinelSageConnectionRepository
  extends MongoCrudRepository<AnnixSentinelSageConnection>
  implements AnnixSentinelSageConnectionRepository
{
  constructor(
    @InjectModel("AnnixSentinelSageConnection") model: Model<AnnixSentinelSageConnection>,
  ) {
    super(model);
  }

  async findByCompany(companyId: number): Promise<AnnixSentinelSageConnection | null> {
    const document = await this.documents.findOne({ companyId }).lean().exec();
    return this.toDomain(document);
  }

  async deleteByCompany(companyId: number): Promise<number> {
    const result = await this.documents.deleteMany({ companyId }).exec();
    return result.deletedCount ?? 0;
  }
}
