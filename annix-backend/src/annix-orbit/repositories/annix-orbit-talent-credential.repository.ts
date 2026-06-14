import { CrudRepository } from "../../lib/persistence/crud-repository";
import { AnnixOrbitTalentCredential } from "../entities/annix-orbit-talent-credential.entity";

export abstract class AnnixOrbitTalentCredentialRepository extends CrudRepository<AnnixOrbitTalentCredential> {
  abstract findByCandidate(candidateId: number): Promise<AnnixOrbitTalentCredential[]>;
  abstract listForCandidates(candidateIds: number[]): Promise<AnnixOrbitTalentCredential[]>;
  abstract expiringForCompany(
    companyId: number,
    dayStart: string,
    dayEnd: string,
  ): Promise<AnnixOrbitTalentCredential[]>;
  abstract deleteById(id: number): Promise<void>;
}
