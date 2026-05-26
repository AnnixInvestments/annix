import { CrudRepository } from "../../lib/persistence/crud-repository";
import { AnnixOrbitCompany } from "../entities/annix-orbit-company.entity";

export abstract class AnnixOrbitCompanyRepository extends CrudRepository<AnnixOrbitCompany> {
  abstract mirrorCompany(id: number, name: string): Promise<void>;
}
