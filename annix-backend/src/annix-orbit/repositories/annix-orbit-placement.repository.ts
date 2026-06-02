import { CrudRepository } from "../../lib/persistence/crud-repository";
import { AnnixOrbitPlacement } from "../entities/annix-orbit-placement.entity";

export abstract class AnnixOrbitPlacementRepository extends CrudRepository<AnnixOrbitPlacement> {
  abstract findByCompany(companyId: number): Promise<AnnixOrbitPlacement[]>;
  abstract findByIdForCompany(id: number, companyId: number): Promise<AnnixOrbitPlacement | null>;
}
