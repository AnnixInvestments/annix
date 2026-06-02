import { CrudRepository } from "../../lib/persistence/crud-repository";
import { AnnixOrbitClient } from "../entities/annix-orbit-client.entity";

export abstract class AnnixOrbitClientRepository extends CrudRepository<AnnixOrbitClient> {
  abstract findByCompany(companyId: number): Promise<AnnixOrbitClient[]>;
  abstract findByIdForCompany(id: number, companyId: number): Promise<AnnixOrbitClient | null>;
}
