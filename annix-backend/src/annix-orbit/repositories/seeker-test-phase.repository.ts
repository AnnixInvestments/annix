import { CrudRepository } from "../../lib/persistence/crud-repository";
import { SeekerTestPhase } from "../entities/seeker-test-phase.entity";

export abstract class SeekerTestPhaseRepository extends CrudRepository<SeekerTestPhase> {
  abstract listNewestFirst(): Promise<SeekerTestPhase[]>;
  abstract findByStatus(status: string): Promise<SeekerTestPhase[]>;
}
