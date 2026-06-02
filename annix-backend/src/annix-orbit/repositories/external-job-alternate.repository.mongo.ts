import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { ORBIT_CONNECTION } from "../../lib/persistence/mongo-connections";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { ExternalJobAlternate } from "../entities/external-job-alternate.entity";
import { ExternalJobAlternateRepository } from "./external-job-alternate.repository";

@Injectable()
export class MongoExternalJobAlternateRepository
  extends MongoCrudRepository<ExternalJobAlternate>
  implements ExternalJobAlternateRepository
{
  constructor(
    @InjectModel("ExternalJobAlternate", ORBIT_CONNECTION) model: Model<ExternalJobAlternate>,
  ) {
    super(model);
  }

  async findByExternalIds(
    externalIds: string[],
    sourceId: number,
  ): Promise<ExternalJobAlternate[]> {
    if (externalIds.length === 0) return [];
    const docs = await this.documents
      .find({ sourceExternalId: { $in: externalIds }, sourceId })
      .select("sourceExternalId canonicalExternalJobId")
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async deleteByCanonicalId(canonicalExternalJobId: number): Promise<void> {
    await this.documents.deleteMany({ canonicalExternalJobId }).exec();
  }

  async deleteByCanonicalIds(canonicalExternalJobIds: number[]): Promise<void> {
    if (canonicalExternalJobIds.length === 0) return;
    await this.documents
      .deleteMany({ canonicalExternalJobId: { $in: canonicalExternalJobIds } })
      .exec();
  }
}
