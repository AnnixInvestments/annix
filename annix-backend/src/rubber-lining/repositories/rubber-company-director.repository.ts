import { CrudRepository } from "../../lib/persistence/crud-repository";
import { RubberCompanyDirector } from "../entities/rubber-company-director.entity";

export abstract class RubberCompanyDirectorRepository extends CrudRepository<RubberCompanyDirector> {
  abstract findAllOrderedByName(): Promise<RubberCompanyDirector[]>;
  abstract findActiveOrderedByName(): Promise<RubberCompanyDirector[]>;
  abstract build(data: Partial<RubberCompanyDirector>): RubberCompanyDirector;
  abstract deleteById(id: number): Promise<boolean>;
}
