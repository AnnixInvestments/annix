import { CrudRepository } from "../../lib/persistence/crud-repository";
import { CandidateReference, ReferenceStatus } from "../entities/candidate-reference.entity";

export abstract class CandidateReferenceRepository extends CrudRepository<CandidateReference> {
  abstract findByCandidate(candidateId: number): Promise<CandidateReference[]>;
  abstract findByCandidateAndStatus(
    candidateId: number,
    status: ReferenceStatus,
  ): Promise<CandidateReference[]>;
  abstract findByFeedbackToken(token: string): Promise<CandidateReference | null>;
  abstract findByFeedbackTokenWithCandidate(token: string): Promise<CandidateReference | null>;
  abstract findPendingRemindersBefore(cutoff: Date): Promise<CandidateReference[]>;
  abstract referencesForCompany(
    companyId: number,
    status?: ReferenceStatus,
  ): Promise<CandidateReference[]>;
  abstract removeMany(references: CandidateReference[]): Promise<void>;
}
