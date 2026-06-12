import { CrudRepository } from "../../lib/persistence/crud-repository";
import { AnnixOrbitShortlist } from "../entities/annix-orbit-shortlist.entity";

export abstract class AnnixOrbitShortlistRepository extends CrudRepository<AnnixOrbitShortlist> {
  abstract findByCompany(companyId: number): Promise<AnnixOrbitShortlist[]>;
  abstract findByIdForCompany(id: number, companyId: number): Promise<AnnixOrbitShortlist | null>;
  abstract findByShareToken(token: string): Promise<AnnixOrbitShortlist | null>;
}
