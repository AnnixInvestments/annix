import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { AnnixSentinelRegulatoryUpdate } from "./entities/regulatory-update.entity";
import { AnnixSentinelRegulatoryUpdateRepository } from "./regulatory-update.repository";

@Injectable()
export class MongoAnnixSentinelRegulatoryUpdateRepository
  extends MongoCrudRepository<AnnixSentinelRegulatoryUpdate>
  implements AnnixSentinelRegulatoryUpdateRepository
{
  constructor(
    @InjectModel("AnnixSentinelRegulatoryUpdate")
    model: Model<AnnixSentinelRegulatoryUpdate>,
  ) {
    super(model);
  }

  async findRecent(limit: number): Promise<AnnixSentinelRegulatoryUpdate[]> {
    const documents = await this.documents
      .find()
      .sort({ publishedAt: -1 })
      .limit(limit)
      .lean()
      .exec();
    return this.toDomainList(documents);
  }

  async findByCategoryNewestFirst(category: string): Promise<AnnixSentinelRegulatoryUpdate[]> {
    const documents = await this.documents
      .find({ category })
      .sort({ publishedAt: -1 })
      .lean()
      .exec();
    return this.toDomainList(documents);
  }

  async recentTitles(limit: number): Promise<string[]> {
    const documents = await this.documents
      .find()
      .sort({ publishedAt: -1 })
      .limit(limit)
      .select("title")
      .lean()
      .exec();
    return documents.map((document) => String(document.title));
  }
}
