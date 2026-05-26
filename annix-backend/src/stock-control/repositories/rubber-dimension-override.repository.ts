import { CrudRepository, type DeepPartial } from "../../lib/persistence/crud-repository";
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

export abstract class RubberDimensionOverrideRepository extends CrudRepository<RubberDimensionOverride> {
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
