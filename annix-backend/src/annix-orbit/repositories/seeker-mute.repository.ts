import { CrudRepository } from "../../lib/persistence/crud-repository";
import { SeekerMute } from "../entities/seeker-mute.entity";

export abstract class SeekerMuteRepository extends CrudRepository<SeekerMute> {
  abstract findByCandidateAndCompany(
    candidateId: number,
    company: string,
  ): Promise<SeekerMute | null>;
  abstract findByCandidateAndCategory(
    candidateId: number,
    category: string,
  ): Promise<SeekerMute | null>;
  abstract listForCandidates(candidateIds: number[]): Promise<SeekerMute[]>;
  abstract deleteById(id: number): Promise<void>;
}
