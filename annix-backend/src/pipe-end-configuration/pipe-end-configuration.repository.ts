import { CrudRepository } from "../lib/persistence/crud-repository";
import { PipeEndConfiguration } from "./entities/pipe-end-configuration.entity";

export abstract class PipeEndConfigurationRepository extends CrudRepository<PipeEndConfiguration> {
  abstract findAllWithWeldType(): Promise<PipeEndConfiguration[]>;
  abstract findByCode(configCode: string): Promise<PipeEndConfiguration | null>;
  abstract findByItemTypeFilter(
    whereClause: Partial<PipeEndConfiguration>,
  ): Promise<PipeEndConfiguration[]>;
}
