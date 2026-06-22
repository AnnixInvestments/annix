import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { TenantScopedRepository } from "../../lib/persistence/tenant-scoped-repository";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import { RubberCuttingTraining } from "../entities/rubber-cutting-training.entity";

export abstract class RubberCuttingTrainingRepository extends TenantScopedRepository<RubberCuttingTraining> {
  abstract withTransaction(context: TransactionContext): RubberCuttingTrainingRepository;
  abstract saveForCompany(
    companyId: number,
    entity: RubberCuttingTraining,
  ): Promise<RubberCuttingTraining>;
  abstract removeForCompany(companyId: number, entity: RubberCuttingTraining): Promise<void>;
  abstract findOneForCompanyByFingerprint(
    companyId: number,
    panelFingerprint: string,
  ): Promise<RubberCuttingTraining | null>;
  abstract findOneForCompanyById(
    companyId: number,
    id: number,
  ): Promise<RubberCuttingTraining | null>;
  abstract findById(id: number): Promise<RubberCuttingTraining | null>;
  abstract updateById(id: number, changes: DeepPartial<RubberCuttingTraining>): Promise<void>;
  abstract findExactMatches(
    companyId: number,
    panelFingerprint: string,
  ): Promise<RubberCuttingTraining[]>;
  abstract findSimilarByPanelCount(
    companyId: number,
    minCount: number,
    maxCount: number,
  ): Promise<RubberCuttingTraining[]>;
  abstract incrementTimesSuggested(ids: number[]): Promise<void>;
}
