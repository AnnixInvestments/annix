import { CrudRepository, type DeepPartial } from "../lib/persistence/crud-repository";
import { NixLearning } from "./entities/nix-learning.entity";

export abstract class NixLearningRepository extends CrudRepository<NixLearning> {
  abstract build(data: DeepPartial<NixLearning>): NixLearning;
  abstract findActiveRelevanceRules(): Promise<NixLearning[]>;
  abstract findCorrectionByPatternKey(patternKey: string | undefined): Promise<NixLearning | null>;
  abstract findAdminSeededOrdered(): Promise<NixLearning[]>;
  abstract findActiveCorrectionsByCategory(category: string): Promise<NixLearning[]>;
  abstract findActiveCorrectionsByCategoryOrderedByConfidence(
    category: string,
  ): Promise<NixLearning[]>;
  abstract findActiveCorrectionsByCategoryTopByConfidence(
    category: string,
    limit: number,
  ): Promise<NixLearning[]>;
  abstract findActiveAdminCorrectionsByCategoryTopByConfidence(
    category: string,
    limit: number,
  ): Promise<NixLearning[]>;
  abstract findOneCorrectionByPatternKeyCategoryAndValue(
    patternKey: string,
    category: string,
    learnedValue: string,
  ): Promise<NixLearning | null>;
  abstract findActiveCorrectionByPatternKeyAndCategory(
    patternKey: string,
    category: string,
  ): Promise<NixLearning | null>;
  abstract findOneByIdAndCategory(id: number, category: string): Promise<NixLearning | null>;
  abstract findActiveCorrectionByPatternKeyAndCategoryByConfidence(
    patternKey: string,
    category: string,
  ): Promise<NixLearning | null>;
  abstract findCorrectionByPatternKeyAndCategory(
    patternKey: string,
    category: string,
  ): Promise<NixLearning | null>;
}
