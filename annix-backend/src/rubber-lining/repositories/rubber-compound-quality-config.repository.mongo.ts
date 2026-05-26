import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { RubberCompoundQualityConfig } from "../entities/rubber-compound-quality-config.entity";
import { RubberCompoundQualityConfigRepository } from "./rubber-compound-quality-config.repository";

@Injectable()
export class MongoRubberCompoundQualityConfigRepository
  extends MongoCrudRepository<RubberCompoundQualityConfig>
  implements RubberCompoundQualityConfigRepository
{
  constructor(
    @InjectModel("RubberCompoundQualityConfig")
    model: Model<RubberCompoundQualityConfig>,
  ) {
    super(model);
  }

  build(data: Partial<RubberCompoundQualityConfig>): RubberCompoundQualityConfig {
    return data as RubberCompoundQualityConfig;
  }

  async findOneByCompoundCode(compoundCode: string): Promise<RubberCompoundQualityConfig | null> {
    const doc = await this.documents.findOne({ compoundCode }).lean().exec();
    return this.toDomain(doc);
  }
}
