import { CrudRepository } from "../../lib/persistence/crud-repository";
import { AnnixOrbitTalentPool } from "../entities/annix-orbit-talent-pool.entity";

export abstract class AnnixOrbitTalentPoolRepository extends CrudRepository<AnnixOrbitTalentPool> {
  abstract findByCompany(companyId: number): Promise<AnnixOrbitTalentPool[]>;
  abstract findByIdForCompany(id: number, companyId: number): Promise<AnnixOrbitTalentPool | null>;
}
