import { CrudRepository } from "../../lib/persistence/crud-repository";
import { AnnixOrbitTalentCandidate } from "../entities/annix-orbit-talent-candidate.entity";

export abstract class AnnixOrbitTalentCandidateRepository extends CrudRepository<AnnixOrbitTalentCandidate> {
  abstract findVisibleForCompany(
    companyId: number,
    userId: number,
  ): Promise<AnnixOrbitTalentCandidate[]>;
  abstract findByIdForCompany(
    id: number,
    companyId: number,
  ): Promise<AnnixOrbitTalentCandidate | null>;
}
