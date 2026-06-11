import { CrudRepository } from "../../lib/persistence/crud-repository";
import { SeekerWorkflowProgress } from "../entities/seeker-workflow-progress.entity";

export abstract class SeekerWorkflowProgressRepository extends CrudRepository<SeekerWorkflowProgress> {
  abstract findByParticipant(participantId: string): Promise<SeekerWorkflowProgress | null>;
  abstract listAll(): Promise<SeekerWorkflowProgress[]>;
}
