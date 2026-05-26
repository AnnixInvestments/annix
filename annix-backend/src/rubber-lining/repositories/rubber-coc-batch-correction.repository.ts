import { CrudRepository } from "../../lib/persistence/crud-repository";
import { RubberCocBatchCorrection } from "../entities/rubber-coc-batch-correction.entity";

export interface BatchCorrectionHintFilters {
  supplierName?: string | null;
  compoundCode?: string | null;
}

export abstract class RubberCocBatchCorrectionRepository extends CrudRepository<RubberCocBatchCorrection> {
  abstract build(data: Partial<RubberCocBatchCorrection>): RubberCocBatchCorrection;
  abstract saveMany(entities: RubberCocBatchCorrection[]): Promise<RubberCocBatchCorrection[]>;
  abstract findRecentForHints(
    filters: BatchCorrectionHintFilters,
  ): Promise<RubberCocBatchCorrection[]>;
}
