import { CrudRepository } from "../lib/persistence/crud-repository";
import { SteelSpecification } from "./entities/steel-specification.entity";

export abstract class SteelSpecificationRepository extends CrudRepository<SteelSpecification> {
  abstract findAllWithRelations(): Promise<SteelSpecification[]>;
  abstract findByIdWithRelations(id: number): Promise<SteelSpecification | null>;
  abstract findByName(steelSpecName: string): Promise<SteelSpecification | null>;
  abstract findByIds(ids: number[]): Promise<SteelSpecification[]>;
}
