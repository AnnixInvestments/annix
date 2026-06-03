import { CrudRepository } from "../../lib/persistence/crud-repository";
import { SeekerInterviewEvent } from "../entities/seeker-interview-event.entity";

export abstract class SeekerInterviewEventRepository extends CrudRepository<SeekerInterviewEvent> {
  abstract listForCandidates(candidateIds: number[]): Promise<SeekerInterviewEvent[]>;
  abstract startingBetween(from: Date, to: Date): Promise<SeekerInterviewEvent[]>;
}
