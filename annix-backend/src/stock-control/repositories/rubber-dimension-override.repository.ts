import type { DeepPartial } from "../../lib/persistence/crud-repository";
import { TenantScopedRepository } from "../../lib/persistence/tenant-scoped-repository";
import type { TransactionContext } from "../../lib/persistence/transaction-context";
import { RubberDimensionOverride } from "../entities/rubber-dimension-override.entity";

export interface RubberDimensionOverrideMatch {
  itemType: string | null;
  nbMm: number | null;
  odMm: number | null;
  schedule: string | null;
  pipeLengthMm: number;
  flangeConfig: string | null;
}

export interface RubberDimensionOverrideQuery {
  itemType: string | null;
  nbMm: number | null;
  schedule: string | null;
  pipeLengthMm: number;
  flangeConfig: string | null;
}

export abstract class RubberDimensionOverrideRepository extends TenantScopedRepository<RubberDimensionOverride> {
  abstract withTransaction(context: TransactionContext): RubberDimensionOverrideRepository;
  abstract saveForCompany(
    companyId: number,
    entity: RubberDimensionOverride,
  ): Promise<RubberDimensionOverride>;
  abstract removeForCompany(companyId: number, entity: RubberDimensionOverride): Promise<void>;
  abstract findMatchingOverride(
    companyId: number,
    criteria: RubberDimensionOverrideMatch,
  ): Promise<RubberDimensionOverride | null>;
  abstract findBestSuggestions(
    companyId: number,
    criteria: RubberDimensionOverrideQuery,
  ): Promise<RubberDimensionOverride[]>;
  abstract updateById(id: number, changes: DeepPartial<RubberDimensionOverride>): Promise<void>;
}
