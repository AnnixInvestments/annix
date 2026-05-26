import { CrudRepository } from "../lib/persistence/crud-repository";
import { FeatureFlag } from "./entities/feature-flag.entity";

export abstract class FeatureFlagRepository extends CrudRepository<FeatureFlag> {
  abstract findByKey(flagKey: string): Promise<FeatureFlag | null>;
  abstract findAllOrdered(): Promise<FeatureFlag[]>;
}
