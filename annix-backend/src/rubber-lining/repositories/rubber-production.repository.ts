import { CrudRepository } from "../../lib/persistence/crud-repository";
import { RubberProduction, RubberProductionStatus } from "../entities/rubber-production.entity";

export abstract class RubberProductionRepository extends CrudRepository<RubberProduction> {
  abstract build(data: Partial<RubberProduction>): RubberProduction;
  abstract findFilteredWithRelations(status?: RubberProductionStatus): Promise<RubberProduction[]>;
  abstract findOneByIdWithRelations(id: number): Promise<RubberProduction | null>;
  abstract findLatest(): Promise<RubberProduction | null>;
}
