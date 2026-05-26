import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { FeatureFlag } from "./entities/feature-flag.entity";
import { FeatureFlagRepository } from "./feature-flags.repository";

@Injectable()
export class MongoFeatureFlagRepository
  extends MongoCrudRepository<FeatureFlag>
  implements FeatureFlagRepository
{
  constructor(@InjectModel("FeatureFlag") model: Model<FeatureFlag>) {
    super(model);
  }

  async findByKey(flagKey: string): Promise<FeatureFlag | null> {
    const document = await this.documents.findOne({ flagKey }).lean().exec();
    return this.toDomain(document);
  }

  async findAllOrdered(): Promise<FeatureFlag[]> {
    const documents = await this.documents.find().sort({ flagKey: 1 }).lean().exec();
    return this.toDomainList(documents);
  }
}
