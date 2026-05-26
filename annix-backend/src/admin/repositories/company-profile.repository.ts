import { CrudRepository } from "../../lib/persistence/crud-repository";
import { CompanyProfile } from "../entities/company-profile.entity";

export abstract class CompanyProfileRepository extends CrudRepository<CompanyProfile> {
  abstract findSingleton(): Promise<CompanyProfile | null>;
}
