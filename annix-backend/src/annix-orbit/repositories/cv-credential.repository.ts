import { CrudRepository } from "../../lib/persistence/crud-repository";
import { CvCredential } from "../entities/cv-credential.entity";

export abstract class CvCredentialRepository extends CrudRepository<CvCredential> {
  abstract listForCandidates(candidateIds: number[]): Promise<CvCredential[]>;
  abstract findByCandidate(candidateId: number): Promise<CvCredential[]>;
  abstract validForCandidates(candidateIds: number[], today: string): Promise<CvCredential[]>;
  abstract expiringBetween(dayStart: string, dayEnd: string): Promise<CvCredential[]>;
  abstract deleteById(id: number): Promise<void>;
}
