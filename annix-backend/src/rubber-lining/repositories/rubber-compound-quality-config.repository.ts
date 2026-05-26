import { CrudRepository } from "../../lib/persistence/crud-repository";
import { RubberCompoundQualityConfig } from "../entities/rubber-compound-quality-config.entity";

export abstract class RubberCompoundQualityConfigRepository extends CrudRepository<RubberCompoundQualityConfig> {
  abstract build(data: Partial<RubberCompoundQualityConfig>): RubberCompoundQualityConfig;
  abstract findOneByCompoundCode(compoundCode: string): Promise<RubberCompoundQualityConfig | null>;
}
