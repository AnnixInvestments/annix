import { CrudRepository } from "../../lib/persistence/crud-repository";
import { SeekerTestParticipant } from "../entities/seeker-test-participant.entity";

export abstract class SeekerTestParticipantRepository extends CrudRepository<SeekerTestParticipant> {
  abstract findByCandidateAndPhase(
    candidateId: number,
    phaseId: string,
  ): Promise<SeekerTestParticipant | null>;
  abstract findByCandidate(candidateId: number): Promise<SeekerTestParticipant[]>;
  abstract listByPhase(phaseId: string): Promise<SeekerTestParticipant[]>;
  abstract countByPhase(phaseId: string): Promise<number>;
}
