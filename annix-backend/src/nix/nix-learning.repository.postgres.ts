import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, type DeepPartial as TypeOrmDeepPartial } from "typeorm";
import type { DeepPartial } from "../lib/persistence/crud-repository";
import { TypeOrmCrudRepository } from "../lib/persistence/typeorm-crud-repository";
import { LearningSource, LearningType, NixLearning } from "./entities/nix-learning.entity";
import { NixLearningRepository } from "./nix-learning.repository";

@Injectable()
export class PostgresNixLearningRepository
  extends TypeOrmCrudRepository<NixLearning>
  implements NixLearningRepository
{
  constructor(@InjectRepository(NixLearning) repository: Repository<NixLearning>) {
    super(repository);
  }

  build(data: DeepPartial<NixLearning>): NixLearning {
    return this.repository.create(data as TypeOrmDeepPartial<NixLearning>);
  }

  findActiveRelevanceRules(): Promise<NixLearning[]> {
    return this.repository.find({
      where: {
        learningType: LearningType.RELEVANCE_RULE,
        isActive: true,
      },
    });
  }

  findCorrectionByPatternKey(patternKey: string | undefined): Promise<NixLearning | null> {
    return this.repository.findOne({
      where: {
        patternKey,
        learningType: LearningType.CORRECTION,
      },
    });
  }

  findAdminSeededOrdered(): Promise<NixLearning[]> {
    return this.repository.find({
      where: { source: LearningSource.ADMIN_SEEDED },
      order: { createdAt: "DESC" },
    });
  }

  findActiveCorrectionsByCategory(category: string): Promise<NixLearning[]> {
    return this.repository.find({
      where: {
        learningType: LearningType.CORRECTION,
        category,
        isActive: true,
      },
    });
  }

  findActiveCorrectionsByCategoryOrderedByConfidence(category: string): Promise<NixLearning[]> {
    return this.repository.find({
      where: {
        learningType: LearningType.CORRECTION,
        category,
        isActive: true,
      },
      order: { confidence: "DESC", confirmationCount: "DESC" },
    });
  }

  findActiveCorrectionsByCategoryTopByConfidence(
    category: string,
    limit: number,
  ): Promise<NixLearning[]> {
    return this.repository.find({
      where: {
        learningType: LearningType.CORRECTION,
        category,
        isActive: true,
      },
      order: { confidence: "DESC" },
      take: limit,
    });
  }

  findOneCorrectionByPatternKeyCategoryAndValue(
    patternKey: string,
    category: string,
    learnedValue: string,
  ): Promise<NixLearning | null> {
    return this.repository.findOne({
      where: {
        patternKey,
        learningType: LearningType.CORRECTION,
        category,
        learnedValue,
      },
    });
  }

  findActiveCorrectionByPatternKeyAndCategory(
    patternKey: string,
    category: string,
  ): Promise<NixLearning | null> {
    return this.repository.findOne({
      where: {
        patternKey,
        learningType: LearningType.CORRECTION,
        category,
        isActive: true,
      },
      order: { confidence: "DESC", confirmationCount: "DESC" },
    });
  }

  findOneByIdAndCategory(id: number, category: string): Promise<NixLearning | null> {
    return this.repository.findOne({
      where: { id, category },
    });
  }

  findActiveCorrectionByPatternKeyAndCategoryByConfidence(
    patternKey: string,
    category: string,
  ): Promise<NixLearning | null> {
    return this.repository.findOne({
      where: {
        patternKey,
        learningType: LearningType.CORRECTION,
        category,
        isActive: true,
      },
      order: { confidence: "DESC" },
    });
  }

  findCorrectionByPatternKeyAndCategory(
    patternKey: string,
    category: string,
  ): Promise<NixLearning | null> {
    return this.repository.findOne({
      where: {
        patternKey,
        learningType: LearningType.CORRECTION,
        category,
      },
    });
  }
}
