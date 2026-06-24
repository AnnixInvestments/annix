import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import type { Model } from "mongoose";
import type { DeepPartial } from "../lib/persistence/crud-repository";
import { MongoCrudRepository } from "../lib/persistence/mongo-crud-repository";
import { LearningSource, LearningType, NixLearning } from "./entities/nix-learning.entity";
import { NixLearningRepository } from "./nix-learning.repository";

@Injectable()
export class MongoNixLearningRepository
  extends MongoCrudRepository<NixLearning>
  implements NixLearningRepository
{
  constructor(@InjectModel("NixLearning") model: Model<NixLearning>) {
    super(model);
  }

  build(data: DeepPartial<NixLearning>): NixLearning {
    return data as NixLearning;
  }

  async findActiveRelevanceRules(): Promise<NixLearning[]> {
    return this.toDomainList(
      await this.documents
        .find({ learningType: LearningType.RELEVANCE_RULE, isActive: true })
        .lean()
        .exec(),
    );
  }

  async findCorrectionByPatternKey(patternKey: string | undefined): Promise<NixLearning | null> {
    const filter: Record<string, unknown> = { learningType: LearningType.CORRECTION };
    if (patternKey !== undefined) {
      filter.patternKey = patternKey;
    }
    return this.toDomain(await this.documents.findOne(filter).lean().exec());
  }

  async findAdminSeededOrdered(): Promise<NixLearning[]> {
    return this.toDomainList(
      await this.documents
        .find({ source: LearningSource.ADMIN_SEEDED })
        .sort({ createdAt: -1 })
        .lean()
        .exec(),
    );
  }

  async findActiveCorrectionsByCategory(category: string): Promise<NixLearning[]> {
    return this.toDomainList(
      await this.documents
        .find({ learningType: LearningType.CORRECTION, category, isActive: true })
        .lean()
        .exec(),
    );
  }

  async findActiveCorrectionsByCategoryOrderedByConfidence(
    category: string,
  ): Promise<NixLearning[]> {
    return this.toDomainList(
      await this.documents
        .find({ learningType: LearningType.CORRECTION, category, isActive: true })
        .sort({ confidence: -1, confirmationCount: -1 })
        .lean()
        .exec(),
    );
  }

  async findActiveCorrectionsByCategoryTopByConfidence(
    category: string,
    limit: number,
  ): Promise<NixLearning[]> {
    return this.toDomainList(
      await this.documents
        .find({ learningType: LearningType.CORRECTION, category, isActive: true })
        .sort({ confidence: -1 })
        .limit(limit)
        .lean()
        .exec(),
    );
  }

  async findActiveAdminCorrectionsByCategoryTopByConfidence(
    category: string,
    limit: number,
  ): Promise<NixLearning[]> {
    return this.toDomainList(
      await this.documents
        .find({
          learningType: LearningType.CORRECTION,
          category,
          isActive: true,
          source: LearningSource.ADMIN_SEEDED,
        })
        .sort({ confidence: -1 })
        .limit(limit)
        .lean()
        .exec(),
    );
  }

  async findOneCorrectionByPatternKeyCategoryAndValue(
    patternKey: string,
    category: string,
    learnedValue: string,
  ): Promise<NixLearning | null> {
    return this.toDomain(
      await this.documents
        .findOne({
          patternKey,
          learningType: LearningType.CORRECTION,
          category,
          learnedValue,
        })
        .lean()
        .exec(),
    );
  }

  async findActiveCorrectionByPatternKeyAndCategory(
    patternKey: string,
    category: string,
  ): Promise<NixLearning | null> {
    return this.toDomain(
      await this.documents
        .findOne({
          patternKey,
          learningType: LearningType.CORRECTION,
          category,
          isActive: true,
        })
        .sort({ confidence: -1, confirmationCount: -1 })
        .lean()
        .exec(),
    );
  }

  async findOneByIdAndCategory(id: number, category: string): Promise<NixLearning | null> {
    return this.toDomain(await this.documents.findOne({ _id: id, category }).lean().exec());
  }

  async findActiveCorrectionByPatternKeyAndCategoryByConfidence(
    patternKey: string,
    category: string,
  ): Promise<NixLearning | null> {
    return this.toDomain(
      await this.documents
        .findOne({
          patternKey,
          learningType: LearningType.CORRECTION,
          category,
          isActive: true,
        })
        .sort({ confidence: -1 })
        .lean()
        .exec(),
    );
  }

  async findCorrectionByPatternKeyAndCategory(
    patternKey: string,
    category: string,
  ): Promise<NixLearning | null> {
    return this.toDomain(
      await this.documents
        .findOne({ patternKey, learningType: LearningType.CORRECTION, category })
        .lean()
        .exec(),
    );
  }
}
