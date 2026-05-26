import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import { type DeepPartial } from "../../lib/persistence/crud-repository";
import { MongoCrudRepository } from "../../lib/persistence/mongo-crud-repository";
import { RubberDimensionOverride } from "../entities/rubber-dimension-override.entity";
import {
  type RubberDimensionOverrideMatch,
  type RubberDimensionOverrideQuery,
  RubberDimensionOverrideRepository,
} from "./rubber-dimension-override.repository";

@Injectable()
export class MongoRubberDimensionOverrideRepository
  extends MongoCrudRepository<RubberDimensionOverride>
  implements RubberDimensionOverrideRepository
{
  constructor(
    @InjectModel("RubberDimensionOverride")
    model: Model<RubberDimensionOverride>,
  ) {
    super(model);
  }

  async findMatchingOverride(
    companyId: number,
    criteria: RubberDimensionOverrideMatch,
  ): Promise<RubberDimensionOverride | null> {
    const doc = await this.documents
      .findOne({
        companyId,
        itemType: criteria.itemType,
        nbMm: criteria.nbMm,
        odMm: criteria.odMm,
        schedule: criteria.schedule,
        pipeLengthMm: criteria.pipeLengthMm,
        flangeConfig: criteria.flangeConfig,
      })
      .lean()
      .exec();
    return this.toDomain(doc);
  }

  async findBestSuggestions(
    companyId: number,
    criteria: RubberDimensionOverrideQuery,
  ): Promise<RubberDimensionOverride[]> {
    const docs = await this.documents
      .find({
        companyId,
        itemType: criteria.itemType,
        nbMm: criteria.nbMm,
        schedule: criteria.schedule,
        pipeLengthMm: criteria.pipeLengthMm,
        flangeConfig: criteria.flangeConfig,
      })
      .sort({ usageCount: -1 })
      .limit(1)
      .lean()
      .exec();
    return this.toDomainList(docs);
  }

  async updateById(id: number, changes: DeepPartial<RubberDimensionOverride>): Promise<void> {
    await this.documents.findByIdAndUpdate(id, changes as Record<string, unknown>).exec();
  }
}
